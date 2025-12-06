"""
Midnight client module for interacting with Midnight devnet.
Provides functions to submit ZK proofs to the AuditVerifier contract.
"""
import os
import hashlib
import json
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path
import sys
import httpx

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log

# Configuration
MIDNIGHT_DEVNET_URL = os.getenv("MIDNIGHT_DEVNET_URL", "http://localhost:6300")
MIDNIGHT_BRIDGE_URL = os.getenv("MIDNIGHT_BRIDGE_URL", "http://localhost:3000")
MIDNIGHT_API_URL = os.getenv("MIDNIGHT_API_URL", "http://localhost:8000")  # FastAPI server
MIDNIGHT_CONTRACT_ADDRESS = os.getenv("MIDNIGHT_CONTRACT_ADDRESS", "")
MIDNIGHT_SIMULATION_MODE = os.getenv("MIDNIGHT_SIMULATION_MODE", "false").lower() == "true"

# Health check cache (to avoid checking on every call)
_midnight_health_cache = {"last_check": None, "is_healthy": False, "cache_ttl": 60}  # Cache for 60 seconds


def generate_audit_id(exploit_string: str, timestamp: str) -> str:
    """
    Generate a deterministic audit ID from exploit string and timestamp.
    
    Args:
        exploit_string: The exploit payload
        timestamp: ISO timestamp string
        
    Returns:
        str: 32-byte hex string (64 characters)
    """
    hash_input = f"{exploit_string}{timestamp}".encode()
    audit_id = hashlib.sha256(hash_input).hexdigest()[:64]
    return audit_id


def create_private_state(exploit_string: str, risk_score: int) -> Dict[str, Any]:
    """
    Create private state for Midnight contract witness.
    
    Args:
        exploit_string: The exploit payload string
        risk_score: Risk score (0-100)
        
    Returns:
        dict: Private state dictionary
    """
    # Pad exploit string to 64 bytes for Bytes<64>
    exploit_bytes = exploit_string.encode('utf-8')
    if len(exploit_bytes) > 64:
        exploit_bytes = exploit_bytes[:64]
    else:
        exploit_bytes = exploit_bytes + b'\x00' * (64 - len(exploit_bytes))
    
    return {
        "exploitString": list(exploit_bytes),
        "riskScore": risk_score
    }


async def submit_audit_proof(
    audit_id: str,
    exploit_string: str,
    risk_score: int,
    auditor_id: str,
    threshold: int = 90
) -> Optional[str]:
    """
    Submit an audit proof to Midnight devnet via FastAPI server.
    
    Args:
        audit_id: Unique audit identifier (32 bytes hex string)
        exploit_string: The exploit payload
        risk_score: Risk score (must be >= threshold)
        auditor_id: Judge/auditor identifier (32 bytes hex string)
        threshold: Minimum risk score required (default: 90)
        
    Returns:
        str: Proof hash if successful, None if failed
        
    Raises:
        Exception: If Midnight API is unavailable and simulation mode is disabled
    """
    try:
        log("Midnight", "Generating Zero-Knowledge Proof of Audit...", "🛡️", "info")
        
        # Check Midnight API health before attempting submission
        if not await check_midnight_health():
            if not MIDNIGHT_SIMULATION_MODE:
                error_msg = f"Midnight API is unavailable at {MIDNIGHT_API_URL}. Please ensure the Midnight FastAPI server is running."
                log("Midnight", error_msg, "🛡️", "error")
                raise Exception(error_msg)
            else:
                log("Midnight", "Midnight API unavailable, using simulation mode", "🛡️", "warning")
                return _simulate_proof_generation(audit_id, exploit_string, risk_score)
        
        # Prepare witness data
        witness = create_private_state(exploit_string, risk_score)
        
        # Prepare request to Midnight FastAPI
        request_data = {
            "audit_id": audit_id,
            "auditor_addr": auditor_id,
            "threshold": threshold,
            "witness": witness
        }
        
        # Call Midnight FastAPI server
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{MIDNIGHT_API_URL}/api/submit-audit",
                    json=request_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        # Extract proof hash from transaction_id or generate from audit_id
                        proof_hash = data.get("transaction_id") or f"zk_{audit_id[:16]}"
                        log("Midnight", f"Proof Minted. Hash: {proof_hash} (Verified)", "🛡️", "info")
                        return proof_hash
                    else:
                        error_msg = data.get("error", "Unknown error")
                        log("Midnight", f"Midnight API returned error: {error_msg}", "🛡️", "error")
                        # Only use simulation if explicitly enabled
                        if MIDNIGHT_SIMULATION_MODE:
                            log("Midnight", "Simulation mode enabled, generating simulated proof", "🛡️", "warning")
                            return _simulate_proof_generation(audit_id, exploit_string, risk_score)
                        # Fail gracefully without simulation
                        raise Exception(f"Midnight API error: {error_msg}")
                else:
                    error_msg = f"Midnight API returned status {response.status_code}"
                    log("Midnight", error_msg, "🛡️", "error")
                    # Only use simulation if explicitly enabled
                    if MIDNIGHT_SIMULATION_MODE:
                        log("Midnight", "Simulation mode enabled, generating simulated proof", "🛡️", "warning")
                        return _simulate_proof_generation(audit_id, exploit_string, risk_score)
                    # Fail gracefully without simulation
                    raise Exception(f"Midnight API returned status {response.status_code}")
                    
            except (httpx.ConnectError, httpx.TimeoutException) as e:
                error_msg = f"Midnight API unavailable ({type(e).__name__}): {str(e)}"
                log("Midnight", error_msg, "🛡️", "error")
                # Only use simulation if explicitly enabled
                if MIDNIGHT_SIMULATION_MODE:
                    log("Midnight", "Simulation mode enabled, generating simulated proof", "🛡️", "warning")
                    return _simulate_proof_generation(audit_id, exploit_string, risk_score)
                # Fail gracefully without simulation
                raise Exception(f"Midnight API unavailable: {str(e)}")
        
    except Exception as e:
        error_msg = f"Error submitting audit proof: {str(e)}"
        log("Midnight", error_msg, "🛡️", "error")
        # Only use simulation if explicitly enabled
        if MIDNIGHT_SIMULATION_MODE:
            log("Midnight", "Simulation mode enabled, generating simulated proof", "🛡️", "warning")
            return _simulate_proof_generation(audit_id, exploit_string, risk_score)
        # Re-raise exception to fail gracefully
        raise


def _simulate_proof_generation(audit_id: str, exploit_string: str, risk_score: int) -> str:
    """
    Simulate proof generation (for development/testing only).
    Only used when MIDNIGHT_SIMULATION_MODE is enabled.
    In production, this should never be called.
    
    Args:
        audit_id: Audit identifier
        exploit_string: Exploit payload
        risk_score: Risk score
        
    Returns:
        str: Simulated proof hash
    """
    # Generate deterministic proof hash
    hash_input = f"{audit_id}{exploit_string}{risk_score}".encode()
    proof_hash = "zk_" + hashlib.sha256(hash_input).hexdigest()[:16]
    return proof_hash


async def verify_audit_status(audit_id: str, max_retries: int = 3) -> Optional[Dict[str, Any]]:
    """
    Check if an audit is verified on-chain via Midnight FastAPI.
    Implements retry logic with exponential backoff for transient failures.
    
    Args:
        audit_id: Audit identifier
        max_retries: Maximum number of retry attempts (default: 3)
        
    Returns:
        dict: Status information with is_verified, auditor_id, proof_hash
        None if audit not found or error after retries
    """
    # Prepare request to Midnight FastAPI
    request_data = {
        "audit_id": audit_id
    }
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            # Call Midnight FastAPI server
            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    response = await client.post(
                        f"{MIDNIGHT_API_URL}/api/query-audit",
                        json=request_data,
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("found"):
                            return {
                                "is_verified": data.get("is_verified", False),
                                "audit_id": data.get("audit_id", audit_id),
                                "proof_hash": data.get("proof_hash")
                            }
                        else:
                            # Audit not found (not an error, just not found)
                            return None
                    elif response.status_code >= 500:
                        # Server error - retry with exponential backoff
                        last_error = f"Midnight API returned status {response.status_code}"
                        if attempt < max_retries - 1:
                            wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                            log("Midnight", f"{last_error}, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})", "🛡️", "warning")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            log("Midnight", f"{last_error} after {max_retries} attempts", "🛡️", "error")
                    else:
                        # Client error (4xx) - don't retry
                        error_msg = f"Midnight API returned status {response.status_code} for audit query"
                        log("Midnight", error_msg, "🛡️", "error")
                        # Only use simulation if explicitly enabled
                        if MIDNIGHT_SIMULATION_MODE:
                            log("Midnight", "Simulation mode enabled, returning simulated status", "🛡️", "warning")
                            return {
                                "is_verified": True,
                                "audit_id": audit_id,
                                "proof_hash": _simulate_proof_generation(audit_id, "", 0)
                            }
                        # Return None to indicate audit not found (not an error for 4xx)
                        return None
                        
                except (httpx.ConnectError, httpx.TimeoutException) as e:
                    # Network error - retry with exponential backoff
                    last_error = f"Midnight API unavailable ({type(e).__name__}): {str(e)}"
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                        log("Midnight", f"{last_error}, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})", "🛡️", "warning")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        log("Midnight", f"{last_error} after {max_retries} attempts", "🛡️", "error")
                        
        except Exception as e:
            # Unexpected error - retry with exponential backoff
            last_error = f"Error verifying audit status: {str(e)}"
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                log("Midnight", f"{last_error}, retrying in {wait_time}s (attempt {attempt + 1}/{max_retries})", "🛡️", "warning")
                await asyncio.sleep(wait_time)
                continue
            else:
                log("Midnight", f"{last_error} after {max_retries} attempts", "🛡️", "error")
    
    # All retries exhausted
    if MIDNIGHT_SIMULATION_MODE:
        log("Midnight", "Simulation mode enabled, returning simulated status after retries exhausted", "🛡️", "warning")
        return {
            "is_verified": True,
            "audit_id": audit_id,
            "proof_hash": _simulate_proof_generation(audit_id, "", 0)
        }
    # Return None to indicate audit status could not be verified
    log("Midnight", f"Failed to verify audit status after {max_retries} retries", "🛡️", "error")
    return None


async def check_midnight_health(force_check: bool = False) -> bool:
    """
    Check if Midnight FastAPI server is healthy (with caching).
    
    Args:
        force_check: If True, bypass cache and check immediately
        
    Returns:
        bool: True if Midnight API is healthy, False otherwise
    """
    import time
    
    global _midnight_health_cache
    
    # Check cache first (unless forced)
    if not force_check and _midnight_health_cache["last_check"] is not None:
        elapsed = time.time() - _midnight_health_cache["last_check"]
        if elapsed < _midnight_health_cache["cache_ttl"]:
            return _midnight_health_cache["is_healthy"]
    
    # Perform health check
    api_url = MIDNIGHT_API_URL
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{api_url}/health")
            is_healthy = response.status_code == 200
            
            # Update cache
            _midnight_health_cache["last_check"] = time.time()
            _midnight_health_cache["is_healthy"] = is_healthy
            
            if is_healthy:
                log("Midnight", f"Midnight API health check passed: {api_url}", "🛡️", "info")
            else:
                log("Midnight", f"Midnight API health check failed: status {response.status_code}", "🛡️", "warning")
            
            return is_healthy
    except Exception as e:
        _midnight_health_cache["last_check"] = time.time()
        _midnight_health_cache["is_healthy"] = False
        log("Midnight", f"Midnight API health check failed: {str(e)}", "🛡️", "warning")
        return False


async def connect_to_devnet(devnet_url: str = None) -> bool:
    """
    Test connection to Midnight FastAPI server.
    
    Args:
        devnet_url: Optional devnet URL (uses default if not provided)
        
    Returns:
        bool: True if connection successful, False otherwise
    """
    return await check_midnight_health(force_check=True)

