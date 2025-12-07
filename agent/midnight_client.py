"""
Midnight Client Module - Real Devnet Integration

Provides functions to interact with Midnight Network via the FastAPI bridge server.
Supports submitting ZK proofs to the AuditVerifier contract and querying audit status.
"""
import os
import hashlib
import json
import asyncio
import time
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import sys

import httpx

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log
from config import get_config

# Load configuration
config = get_config()

# Configure module logger
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration
# ============================================================================

# Midnight API Configuration (from config.py)
MIDNIGHT_API_URL = config.MIDNIGHT_API_URL
MIDNIGHT_CONTRACT_ADDRESS = config.MIDNIGHT_CONTRACT_ADDRESS
MIDNIGHT_SIMULATION_MODE = config.MIDNIGHT_SIMULATION_MODE

# Request timeouts (seconds)
DEFAULT_TIMEOUT = 60.0  # For proof submission (can be slow)
QUERY_TIMEOUT = 15.0    # For queries
HEALTH_CHECK_TIMEOUT = 5.0
INIT_TIMEOUT = 120.0    # Contract initialization can be slow

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_BASE = 1.0  # Base delay for exponential backoff
RETRY_JITTER = 0.5      # Random jitter to prevent thundering herd

# Health check cache
_health_cache = {
    "last_check": None,
    "is_healthy": False,
    "contract_address": None,
    "cache_ttl": 30  # Cache for 30 seconds
}


class MidnightError(Exception):
    """Base exception for Midnight client errors."""
    pass


class ConnectionError(MidnightError):
    """Raised when unable to connect to Midnight API."""
    pass


class ContractNotInitializedError(MidnightError):
    """Raised when contract is not initialized."""
    pass


class ProofSubmissionError(MidnightError):
    """Raised when proof submission fails."""
    pass


class AuditQueryError(MidnightError):
    """Raised when audit query fails."""
    pass


@dataclass
class SubmitProofResult:
    """Result of proof submission."""
    success: bool
    proof_hash: Optional[str] = None
    transaction_id: Optional[str] = None
    block_height: Optional[int] = None
    error: Optional[str] = None
    ledger_state: Optional[Dict[str, Any]] = None


@dataclass
class QueryAuditResult:
    """Result of audit query."""
    found: bool
    audit_id: str
    proof_hash: Optional[str] = None
    is_verified: bool = False
    error: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

def generate_audit_id(exploit_string: str, timestamp: str) -> str:
    """
    Generate a deterministic audit ID from exploit string and timestamp.
    
    Args:
        exploit_string: The exploit payload
        timestamp: ISO timestamp string
        
    Returns:
        str: 64-character hex string (32 bytes)
    """
    hash_input = f"{exploit_string}{timestamp}".encode()
    audit_id = hashlib.sha256(hash_input).hexdigest()
    return audit_id


def create_private_state(exploit_string: str, risk_score: int) -> Dict[str, Any]:
    """
    Create private state (witness) for Midnight contract ZK circuit.
    
    Args:
        exploit_string: The exploit payload string
        risk_score: Risk score (0-100)
        
    Returns:
        dict: Private state dictionary with exploitString and riskScore
    """
    # Pad exploit string to 64 bytes for Bytes<64> in contract
    exploit_bytes = exploit_string.encode('utf-8')
    if len(exploit_bytes) > 64:
        exploit_bytes = exploit_bytes[:64]
    else:
        exploit_bytes = exploit_bytes + b'\x00' * (64 - len(exploit_bytes))
    
    return {
        "exploitString": list(exploit_bytes),
        "riskScore": risk_score
    }


async def _sleep_with_jitter(base_delay: float, attempt: int) -> None:
    """Sleep with exponential backoff and random jitter."""
    import random
    delay = base_delay * (2 ** attempt)
    jitter = random.uniform(0, RETRY_JITTER * delay)
    await asyncio.sleep(delay + jitter)


# ============================================================================
# Health Check & Initialization
# ============================================================================

async def check_midnight_health(force_check: bool = False) -> Dict[str, Any]:
    """
    Check if Midnight FastAPI server is healthy and contract is initialized.
    
    Args:
        force_check: If True, bypass cache and check immediately
        
    Returns:
        dict: Health status with keys:
            - is_healthy: bool
            - initialized: bool
            - contract_address: Optional[str]
            - error: Optional[str]
    """
    global _health_cache
    
    # Check cache first (unless forced)
    if not force_check and _health_cache["last_check"] is not None:
        elapsed = time.time() - _health_cache["last_check"]
        if elapsed < _health_cache["cache_ttl"]:
            return {
                "is_healthy": _health_cache["is_healthy"],
                "initialized": _health_cache["contract_address"] is not None,
                "contract_address": _health_cache["contract_address"]
            }
    
    # Perform health check
    try:
        async with httpx.AsyncClient(timeout=HEALTH_CHECK_TIMEOUT) as client:
            response = await client.get(f"{MIDNIGHT_API_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                is_healthy = data.get("status") == "healthy"
                contract_address = data.get("contract_address")
                
                # Update cache
                _health_cache["last_check"] = time.time()
                _health_cache["is_healthy"] = is_healthy
                _health_cache["contract_address"] = contract_address
                
                log("Midnight", f"Health check passed: initialized={contract_address is not None}", "🛡️", "info")
                
                return {
                    "is_healthy": is_healthy,
                    "initialized": contract_address is not None,
                    "contract_address": contract_address
                }
            else:
                error_msg = f"Health check returned status {response.status_code}"
                log("Midnight", error_msg, "🛡️", "warning")
                
                _health_cache["last_check"] = time.time()
                _health_cache["is_healthy"] = False
                _health_cache["contract_address"] = None
                
                return {
                    "is_healthy": False,
                    "initialized": False,
                    "error": error_msg
                }
                
    except httpx.TimeoutException:
        error_msg = f"Health check timeout after {HEALTH_CHECK_TIMEOUT}s"
        log("Midnight", error_msg, "🛡️", "warning")
        _health_cache["last_check"] = time.time()
        _health_cache["is_healthy"] = False
        return {"is_healthy": False, "initialized": False, "error": error_msg}
        
    except httpx.ConnectError as e:
        error_msg = f"Cannot connect to Midnight API at {MIDNIGHT_API_URL}: {e}"
        log("Midnight", error_msg, "🛡️", "warning")
        _health_cache["last_check"] = time.time()
        _health_cache["is_healthy"] = False
        return {"is_healthy": False, "initialized": False, "error": error_msg}
        
    except Exception as e:
        error_msg = f"Health check failed: {str(e)}"
        log("Midnight", error_msg, "🛡️", "error")
        _health_cache["last_check"] = time.time()
        _health_cache["is_healthy"] = False
        return {"is_healthy": False, "initialized": False, "error": error_msg}


async def initialize_contract(
    mode: str = "deploy",
    contract_address: Optional[str] = None,
    environment: str = "testnet"
) -> Dict[str, Any]:
    """
    Initialize or join a Midnight contract.
    
    Args:
        mode: "deploy" to deploy new contract, "join" to connect to existing
        contract_address: Required when mode is "join"
        environment: Network environment ("testnet" or "mainnet")
        
    Returns:
        dict: Result with contract_address if successful
        
    Raises:
        MidnightError: If initialization fails
    """
    log("Midnight", f"Initializing contract (mode={mode}, env={environment})", "🛡️", "info")
    
    request_data = {
        "mode": mode,
        "environment": environment
    }
    
    if mode == "join":
        if not contract_address:
            raise ValueError("contract_address is required when mode is 'join'")
        request_data["contract_address"] = contract_address
    
    try:
        async with httpx.AsyncClient(timeout=INIT_TIMEOUT) as client:
            response = await client.post(
                f"{MIDNIGHT_API_URL}/api/init",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    addr = data.get("contract_address")
                    log("Midnight", f"Contract initialized: {addr}", "🛡️", "info")
                    
                    # Update health cache
                    _health_cache["contract_address"] = addr
                    
                    return {
                        "success": True,
                        "contract_address": addr,
                        "message": data.get("message")
                    }
                else:
                    error = data.get("error", "Unknown error")
                    raise MidnightError(f"Contract initialization failed: {error}")
            else:
                raise MidnightError(f"Contract initialization returned status {response.status_code}")
                
    except httpx.TimeoutException:
        raise MidnightError(f"Contract initialization timeout after {INIT_TIMEOUT}s")
    except httpx.ConnectError:
        raise ConnectionError(f"Cannot connect to Midnight API at {MIDNIGHT_API_URL}")
    except MidnightError:
        raise
    except Exception as e:
        raise MidnightError(f"Contract initialization error: {str(e)}")


# ============================================================================
# Proof Submission
# ============================================================================

async def submit_proof(
    audit_id: str,
    exploit_string: str,
    risk_score: int,
    auditor_id: str,
    threshold: int = 90,
    max_retries: int = MAX_RETRIES,
    timeout: float = DEFAULT_TIMEOUT
) -> SubmitProofResult:
    """
    Submit an audit proof to Midnight devnet via FastAPI server.
    Implements retry logic with exponential backoff.
    
    Args:
        audit_id: Unique audit identifier (64-character hex string)
        exploit_string: The exploit payload
        risk_score: Risk score (must be >= threshold)
        auditor_id: Judge/auditor identifier (64-character hex string)
        threshold: Minimum risk score required (default: 90)
        max_retries: Maximum number of retry attempts
        timeout: Request timeout in seconds
        
    Returns:
        SubmitProofResult: Result with proof_hash if successful
    """
    # Validate risk score
    if risk_score < threshold:
        error_msg = f"Risk score {risk_score} is below threshold {threshold}"
        log("Midnight", error_msg, "🛡️", "error")
        return SubmitProofResult(success=False, error=error_msg)
    
    # Check for simulation mode - use real API call instead
    if MIDNIGHT_SIMULATION_MODE:
        log("Midnight", "SIMULATION MODE: Using real API call", "🛡️", "info")
        # Prepare proof_data for the API call
        proof_data = {
            "auditor_addr": auditor_id,
            "threshold": threshold,
            "witness": create_private_state(exploit_string, risk_score)
        }
        return await _simulate_proof_generation(audit_id, proof_data, max_retries, timeout)
    
    # Check Midnight API health
    health = await check_midnight_health()
    if not health.get("is_healthy"):
        error_msg = f"Midnight API is unavailable: {health.get('error', 'Unknown error')}"
        log("Midnight", error_msg, "🛡️", "error")
        return SubmitProofResult(success=False, error=error_msg)
    
    if not health.get("initialized"):
        log("Midnight", "Contract not initialized, attempting initialization...", "🛡️", "info")
        try:
            await initialize_contract(mode="deploy")
        except Exception as e:
            return SubmitProofResult(success=False, error=f"Contract initialization failed: {str(e)}")
    
    # Prepare witness data
    witness = create_private_state(exploit_string, risk_score)
    
    # Prepare request
    request_data = {
        "audit_id": audit_id,
        "auditor_addr": auditor_id,
        "threshold": threshold,
        "witness": witness
    }
    
    log("Midnight", f"Submitting proof for audit {audit_id[:16]}... (risk_score={risk_score}, threshold={threshold})", "🛡️", "info")
    
    last_error = None
    
    # Retry loop with exponential backoff
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{MIDNIGHT_API_URL}/api/submit-audit",
                    json=request_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        proof_hash = data.get("transaction_id")
                        block_height = data.get("block_height")
                        ledger_state = data.get("ledger_state")
                        
                        if not proof_hash:
                            # Generate fallback hash if not returned
                            proof_hash = f"zk_proof_{audit_id[:32]}"
                            log("Midnight", "Warning: No transaction_id in response, using fallback hash", "🛡️", "warning")
                        
                        log("Midnight", f"Proof submitted successfully. Hash: {proof_hash}" +
                            (f" (block: {block_height})" if block_height else ""), "🛡️", "info")
                        
                        return SubmitProofResult(
                            success=True,
                            proof_hash=proof_hash,
                            transaction_id=proof_hash,
                            block_height=block_height,
                            ledger_state=ledger_state
                        )
                    else:
                        error_msg = data.get("error", "Unknown error from Midnight API")
                        log("Midnight", f"Midnight API returned error: {error_msg}", "🛡️", "error")
                        last_error = error_msg
                        
                        # Don't retry on client errors
                        if "threshold" in error_msg.lower() or "invalid" in error_msg.lower():
                            return SubmitProofResult(success=False, error=error_msg)
                        
                elif response.status_code == 400:
                    # Client error - don't retry
                    try:
                        data = response.json()
                        error_msg = data.get("detail", f"HTTP {response.status_code}")
                    except:
                        error_msg = f"HTTP {response.status_code}"
                    log("Midnight", f"Client error: {error_msg}", "🛡️", "error")
                    return SubmitProofResult(success=False, error=error_msg)
                    
                elif response.status_code >= 500:
                    # Server error - retry
                    last_error = f"Server error: HTTP {response.status_code}"
                    log("Midnight", last_error, "🛡️", "warning")
                else:
                    last_error = f"Unexpected HTTP {response.status_code}"
                    log("Midnight", last_error, "🛡️", "warning")
                    
        except httpx.TimeoutException:
            last_error = f"Request timeout after {timeout}s"
            log("Midnight", last_error, "🛡️", "warning")
            
        except httpx.ConnectError as e:
            last_error = f"Connection error: {str(e)}"
            log("Midnight", last_error, "🛡️", "warning")
            
        except Exception as e:
            last_error = f"Unexpected error: {str(e)}"
            log("Midnight", last_error, "🛡️", "error")
        
        # Retry with backoff
        if attempt < max_retries - 1:
            await _sleep_with_jitter(RETRY_DELAY_BASE, attempt)
            log("Midnight", f"Retrying... (attempt {attempt + 2}/{max_retries})", "🛡️", "info")
    
    # All retries exhausted
    error_msg = f"Failed after {max_retries} attempts. Last error: {last_error}"
    log("Midnight", error_msg, "🛡️", "error")
    return SubmitProofResult(success=False, error=error_msg)


# ============================================================================
# Audit Query
# ============================================================================

async def query_audit(
    audit_id: str,
    max_retries: int = MAX_RETRIES,
    timeout: float = QUERY_TIMEOUT
) -> QueryAuditResult:
    """
    Query audit status from Midnight devnet via FastAPI server.
    
    Args:
        audit_id: Audit identifier to query
        max_retries: Maximum number of retry attempts
        timeout: Request timeout in seconds
        
    Returns:
        QueryAuditResult: Query result with verification status
    """
    log("Midnight", f"Querying audit status: {audit_id[:16]}...", "🛡️", "info")
    
    # Check for simulation mode - use real API call instead
    if MIDNIGHT_SIMULATION_MODE:
        log("Midnight", "SIMULATION MODE: Using real API call", "🛡️", "info")
        # verify_audit_status now uses real API, so call it directly
        result_dict = await verify_audit_status(audit_id, max_retries, timeout)
        if result_dict:
            return QueryAuditResult(
                found=True,
                audit_id=result_dict.get("audit_id", audit_id),
                proof_hash=result_dict.get("proof_hash"),
                is_verified=result_dict.get("is_verified", False)
            )
        else:
            return QueryAuditResult(found=False, audit_id=audit_id, is_verified=False)
    
    request_data = {"audit_id": audit_id}
    last_error = None
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{MIDNIGHT_API_URL}/api/query-audit",
                    json=request_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("found"):
                        result = QueryAuditResult(
                            found=True,
                            audit_id=data.get("audit_id", audit_id),
                            proof_hash=data.get("proof_hash"),
                            is_verified=data.get("is_verified", False)
                        )
                        log("Midnight", f"Audit found: verified={result.is_verified}", "🛡️", "info")
                        return result
                    else:
                        log("Midnight", f"Audit not found: {audit_id[:16]}...", "🛡️", "info")
                        return QueryAuditResult(
                            found=False,
                            audit_id=audit_id,
                            is_verified=False
                        )
                        
                elif response.status_code == 400:
                    # Contract not initialized - don't retry
                    try:
                        data = response.json()
                        error_msg = data.get("detail", "Contract not initialized")
                    except:
                        error_msg = "Contract not initialized"
                    log("Midnight", error_msg, "🛡️", "warning")
                    return QueryAuditResult(found=False, audit_id=audit_id, error=error_msg)
                    
                elif response.status_code >= 500:
                    last_error = f"Server error: HTTP {response.status_code}"
                    log("Midnight", last_error, "🛡️", "warning")
                else:
                    last_error = f"HTTP {response.status_code}"
                    log("Midnight", last_error, "🛡️", "warning")
                    
        except httpx.TimeoutException:
            last_error = f"Query timeout after {timeout}s"
            log("Midnight", last_error, "🛡️", "warning")
            
        except httpx.ConnectError as e:
            last_error = f"Connection error: {str(e)}"
            log("Midnight", last_error, "🛡️", "warning")
            
        except Exception as e:
            last_error = f"Unexpected error: {str(e)}"
            log("Midnight", last_error, "🛡️", "error")
        
        # Retry with backoff
        if attempt < max_retries - 1:
            await _sleep_with_jitter(RETRY_DELAY_BASE, attempt)
            log("Midnight", f"Retrying query... (attempt {attempt + 2}/{max_retries})", "🛡️", "info")
    
    # All retries exhausted
    error_msg = f"Query failed after {max_retries} attempts. Last error: {last_error}"
    log("Midnight", error_msg, "🛡️", "error")
    return QueryAuditResult(found=False, audit_id=audit_id, error=error_msg)


async def get_ledger_state() -> Optional[Dict[str, Any]]:
    """
    Get the current ledger state from the Midnight contract.
    
    Returns:
        dict: Ledger state or None if unavailable
    """
    try:
        async with httpx.AsyncClient(timeout=QUERY_TIMEOUT) as client:
            response = await client.get(f"{MIDNIGHT_API_URL}/api/ledger")
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 400:
                log("Midnight", "Contract not initialized", "🛡️", "warning")
                return None
            else:
                log("Midnight", f"Ledger query returned status {response.status_code}", "🛡️", "warning")
                return None
                
    except Exception as e:
        log("Midnight", f"Ledger query error: {str(e)}", "🛡️", "error")
        return None


# ============================================================================
# Network Information
# ============================================================================

async def get_network_health() -> Optional[Dict[str, Any]]:
    """
    Get Midnight network health statistics.
    
    Returns:
        dict: Network health info or None if unavailable
    """
    try:
        async with httpx.AsyncClient(timeout=QUERY_TIMEOUT) as client:
            response = await client.get(f"{MIDNIGHT_API_URL}/network/health")
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
    except Exception as e:
        log("Midnight", f"Network health query error: {str(e)}", "🛡️", "error")
        return None


async def get_wallet_balance() -> Optional[Dict[str, Any]]:
    """
    Get wallet balance from Midnight.
    
    Returns:
        dict: Balance info or None if unavailable
    """
    try:
        async with httpx.AsyncClient(timeout=QUERY_TIMEOUT) as client:
            response = await client.get(f"{MIDNIGHT_API_URL}/wallet/balance")
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
    except Exception as e:
        log("Midnight", f"Wallet balance query error: {str(e)}", "🛡️", "error")
        return None


# ============================================================================
# Simulation Mode (Fallback)
# ============================================================================

async def _simulate_proof_generation(
    audit_id: str,
    proof_data: Dict[str, Any],
    max_retries: int = MAX_RETRIES,
    timeout: float = DEFAULT_TIMEOUT
) -> SubmitProofResult:
    """
    Submit proof to Midnight API via POST /api/submit-audit.
    Replaces old simulation function with real API call.
    
    Args:
        audit_id: Unique audit identifier
        proof_data: Dictionary containing proof data (audit_id, proof_data, etc.)
        max_retries: Maximum number of retry attempts
        timeout: Request timeout in seconds
        
    Returns:
        SubmitProofResult: Result with proof_hash if successful
    """
    log("Midnight", f"Submitting proof via API for audit {audit_id[:16]}...", "🛡️", "info")
    
    # Prepare request payload
    request_data = {
        "audit_id": audit_id,
        **proof_data  # Include any additional proof data
    }
    
    last_error = None
    
    # Retry loop with exponential backoff
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{MIDNIGHT_API_URL}/api/submit-audit",
                    json=request_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        proof_hash = data.get("transaction_id") or data.get("proof_hash")
                        block_height = data.get("block_height")
                        ledger_state = data.get("ledger_state")
                        
                        if not proof_hash:
                            # Generate fallback hash if not returned
                            proof_hash = f"zk_proof_{audit_id[:32]}"
                            log("Midnight", "Warning: No transaction_id in response, using fallback hash", "🛡️", "warning")
                        
                        log("Midnight", f"Proof submitted successfully via API. Hash: {proof_hash}" +
                            (f" (block: {block_height})" if block_height else ""), "🛡️", "info")
                        
                        return SubmitProofResult(
                            success=True,
                            proof_hash=proof_hash,
                            transaction_id=proof_hash,
                            block_height=block_height,
                            ledger_state=ledger_state
                        )
                    else:
                        error_msg = data.get("error", "Unknown error from Midnight API")
                        log("Midnight", f"API returned error: {error_msg}", "🛡️", "error")
                        last_error = error_msg
                        
                        # Don't retry on client errors
                        if "threshold" in error_msg.lower() or "invalid" in error_msg.lower():
                            return SubmitProofResult(success=False, error=error_msg)
                        
                elif response.status_code == 400:
                    # Client error - don't retry
                    try:
                        data = response.json()
                        error_msg = data.get("detail", f"HTTP {response.status_code}")
                    except:
                        error_msg = f"HTTP {response.status_code}"
                    log("Midnight", f"Client error: {error_msg}", "🛡️", "error")
                    return SubmitProofResult(success=False, error=error_msg)
                    
                elif response.status_code >= 500:
                    # Server error - retry
                    last_error = f"Server error: HTTP {response.status_code}"
                    log("Midnight", last_error, "🛡️", "warning")
                else:
                    last_error = f"Unexpected HTTP {response.status_code}"
                    log("Midnight", last_error, "🛡️", "warning")
                    
        except httpx.TimeoutException:
            last_error = f"Request timeout after {timeout}s"
            log("Midnight", last_error, "🛡️", "warning")
            
        except httpx.ConnectError as e:
            last_error = f"Connection error: {str(e)}"
            log("Midnight", last_error, "🛡️", "warning")
            
        except Exception as e:
            last_error = f"Unexpected error: {str(e)}"
            log("Midnight", last_error, "🛡️", "error")
        
        # Retry with backoff
        if attempt < max_retries - 1:
            await _sleep_with_jitter(RETRY_DELAY_BASE, attempt)
            log("Midnight", f"Retrying proof submission... (attempt {attempt + 2}/{max_retries})", "🛡️", "info")
    
    # All retries exhausted
    error_msg = f"Proof submission failed after {max_retries} attempts. Last error: {last_error}"
    log("Midnight", error_msg, "🛡️", "error")
    return SubmitProofResult(success=False, error=error_msg)


# _simulate_audit_query removed - now using real API via verify_audit_status()


# ============================================================================
# Backward Compatibility Wrappers
# ============================================================================

async def submit_audit_proof(
    audit_id: str,
    exploit_string: str,
    risk_score: int,
    auditor_id: str,
    threshold: int = 90
) -> Optional[str]:
    """
    Backward compatibility wrapper for submit_proof().
    
    Returns:
        str: Proof hash if successful, None if failed
    """
    result = await submit_proof(
        audit_id=audit_id,
        exploit_string=exploit_string,
        risk_score=risk_score,
        auditor_id=auditor_id,
        threshold=threshold
    )
    
    if result.success:
        return result.proof_hash
    else:
        log("Midnight", f"Proof submission failed: {result.error}", "🛡️", "error")
        return None


async def verify_audit_status(
    audit_id: str,
    max_retries: int = MAX_RETRIES,
    timeout: float = QUERY_TIMEOUT
) -> Optional[Dict[str, Any]]:
    """
    Verify audit status by directly calling POST /api/query-audit.
    Replaces old wrapper with direct API call.
    
    Args:
        audit_id: Audit identifier to query
        max_retries: Maximum number of retry attempts
        timeout: Request timeout in seconds
        
    Returns:
        dict: Status info with is_verified, audit_id, proof_hash
        None if audit not found or query failed
    """
    log("Midnight", f"Verifying audit status via API: {audit_id[:16]}...", "🛡️", "info")
    
    request_data = {"audit_id": audit_id}
    last_error = None
    
    # Retry loop with exponential backoff
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    f"{MIDNIGHT_API_URL}/api/query-audit",
                    json=request_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("found"):
                        result = {
                            "is_verified": data.get("is_verified", False),
                            "audit_id": data.get("audit_id", audit_id),
                            "proof_hash": data.get("proof_hash"),
                            "timestamp": data.get("timestamp"),
                            "block_height": data.get("block_height")
                        }
                        log("Midnight", f"Audit verified: is_verified={result['is_verified']}", "🛡️", "info")
                        return result
                    else:
                        log("Midnight", f"Audit not found: {audit_id[:16]}...", "🛡️", "info")
                        return None
                        
                elif response.status_code == 400:
                    # Contract not initialized or invalid request - don't retry
                    try:
                        data = response.json()
                        error_msg = data.get("detail", "Contract not initialized")
                    except:
                        error_msg = "Contract not initialized"
                    log("Midnight", error_msg, "🛡️", "warning")
                    return None
                    
                elif response.status_code >= 500:
                    # Server error - retry
                    last_error = f"Server error: HTTP {response.status_code}"
                    log("Midnight", last_error, "🛡️", "warning")
                else:
                    last_error = f"HTTP {response.status_code}"
                    log("Midnight", last_error, "🛡️", "warning")
                    
        except httpx.TimeoutException:
            last_error = f"Query timeout after {timeout}s"
            log("Midnight", last_error, "🛡️", "warning")
            
        except httpx.ConnectError as e:
            last_error = f"Connection error: {str(e)}"
            log("Midnight", last_error, "🛡️", "warning")
            
        except Exception as e:
            last_error = f"Unexpected error: {str(e)}"
            log("Midnight", last_error, "🛡️", "error")
        
        # Retry with backoff
        if attempt < max_retries - 1:
            await _sleep_with_jitter(RETRY_DELAY_BASE, attempt)
            log("Midnight", f"Retrying audit verification... (attempt {attempt + 2}/{max_retries})", "🛡️", "info")
    
    # All retries exhausted
    error_msg = f"Audit verification failed after {max_retries} attempts. Last error: {last_error}"
    log("Midnight", error_msg, "🛡️", "error")
    return None


async def connect_to_devnet(devnet_url: str = None) -> bool:
    """
    Test connection to Midnight FastAPI server.
    Backward compatibility function.
    
    Returns:
        bool: True if connection successful
    """
    health = await check_midnight_health(force_check=True)
    return health.get("is_healthy", False)
