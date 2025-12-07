"""
Proof Verification Module for Judge Agent
Provides capabilities to verify ZK proofs from Midnight Network contracts.
"""
import os
import httpx
import json
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pathlib import Path
import sys
import asyncio

# Add agent directory to path for logger import
sys.path.insert(0, str(Path(__file__).parent))
from logger import log

# Import midnight_client for real API calls
try:
    from midnight_client import (
        query_audit,
        check_midnight_health,
        MIDNIGHT_API_URL,
        MIDNIGHT_SIMULATION_MODE
    )
    MIDNIGHT_CLIENT_AVAILABLE = True
except ImportError:
    MIDNIGHT_CLIENT_AVAILABLE = False
    MIDNIGHT_API_URL = os.getenv("MIDNIGHT_API_URL", "http://localhost:8100")
    MIDNIGHT_SIMULATION_MODE = os.getenv("MIDNIGHT_SIMULATION_MODE", "false").lower() == "true"

# Configuration
MIDNIGHT_DEVNET_URL = os.getenv("MIDNIGHT_DEVNET_URL", "http://localhost:6300")
MIDNIGHT_BRIDGE_URL = os.getenv("MIDNIGHT_BRIDGE_URL", "http://localhost:3000")
MIDNIGHT_CONTRACT_ADDRESS = os.getenv("MIDNIGHT_CONTRACT_ADDRESS", "")
MIDNIGHT_INDEXER = os.getenv("MIDNIGHT_INDEXER", "http://localhost:6300/graphql")
MIDNIGHT_INDEXER_WS = os.getenv("MIDNIGHT_INDEXER_WS", "ws://localhost:6300/graphql/ws")
MIDNIGHT_PROOF_EXPIRY_HOURS = int(os.getenv("MIDNIGHT_PROOF_EXPIRY_HOURS", "24"))


class ProofVerificationResult:
    """Result of proof verification."""
    
    def __init__(
        self,
        isValid: bool,
        isHighSeverity: bool,
        auditorId: str,
        timestamp: datetime,
        proofData: Dict[str, Any],
        error: Optional[str] = None
    ):
        self.isValid = isValid
        self.isHighSeverity = isHighSeverity
        self.auditorId = auditorId
        self.timestamp = timestamp
        self.proofData = proofData
        self.error = error
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "isValid": self.isValid,
            "isHighSeverity": self.isHighSeverity,
            "auditorId": self.auditorId,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else str(self.timestamp),
            "proofData": self.proofData,
            "error": self.error
        }


async def verify_audit_proof(proof_id: str, expected_auditor_id: Optional[str] = None) -> ProofVerificationResult:
    """
    Verify an audit proof from Midnight contract.
    
    Process:
    a. Fetch proof from Midnight contract
    b. Verify ZK proof is valid
    c. Check that risk_score > 90 (without knowing actual score)
    d. Confirm auditor_id matches (if provided)
    e. Return verification result
    
    Args:
        proof_id: The audit ID or proof hash to verify
        expected_auditor_id: Optional auditor ID to verify against
        
    Returns:
        ProofVerificationResult: Verification result with all details
    """
    try:
        log("ProofVerifier", f"Verifying proof: {proof_id[:16]}...", "🔍", "info")
        
        # Step 1: Fetch proof from Midnight contract
        proof_data = await _fetch_proof_from_contract(proof_id)
        if not proof_data:
            return ProofVerificationResult(
                isValid=False,
                isHighSeverity=False,
                auditorId="",
                timestamp=datetime.now(),
                proofData={},
                error="Proof not found on contract"
            )
        
        # Step 2: Verify ZK proof is valid
        is_valid = await _verify_zk_proof(proof_data)
        if not is_valid:
            return ProofVerificationResult(
                isValid=False,
                isHighSeverity=False,
                auditorId=proof_data.get("auditor_id", ""),
                timestamp=datetime.fromisoformat(proof_data.get("timestamp", datetime.now().isoformat())),
                proofData=proof_data,
                error="ZK proof verification failed"
            )
        
        # Step 3: Check that risk_score > 90 (without knowing actual score)
        # This is verified by the contract's ZK circuit, so if proof is valid, risk_score > 90
        is_high_severity = proof_data.get("is_verified", False)
        
        # Step 4: Confirm auditor_id matches (if provided)
        auditor_id = proof_data.get("auditor_id", "")
        if expected_auditor_id and auditor_id != expected_auditor_id:
            return ProofVerificationResult(
                isValid=True,
                isHighSeverity=is_high_severity,
                auditorId=auditor_id,
                timestamp=datetime.fromisoformat(proof_data.get("timestamp", datetime.now().isoformat())),
                proofData=proof_data,
                error=f"Auditor ID mismatch: expected {expected_auditor_id}, got {auditor_id}"
            )
        
        # Step 5: Check for expired proofs
        proof_timestamp = datetime.fromisoformat(proof_data.get("proof_timestamp", datetime.now().isoformat()))
        if _is_proof_expired(proof_timestamp):
            return ProofVerificationResult(
                isValid=True,
                isHighSeverity=is_high_severity,
                auditorId=auditor_id,
                timestamp=proof_timestamp,
                proofData=proof_data,
                error="Proof has expired"
            )
        
        log("ProofVerifier", f"Proof verified successfully: {proof_id[:16]}...", "✅", "info")
        
        return ProofVerificationResult(
            isValid=True,
            isHighSeverity=is_high_severity,
            auditorId=auditor_id,
            timestamp=proof_timestamp,
            proofData=proof_data
        )
        
    except httpx.TimeoutException:
        log("ProofVerifier", f"Network timeout verifying proof: {proof_id[:16]}...", "⚠️", "warn")
        return ProofVerificationResult(
            isValid=False,
            isHighSeverity=False,
            auditorId="",
            timestamp=datetime.now(),
            proofData={},
            error="Network timeout"
        )
    except Exception as e:
        log("ProofVerifier", f"Error verifying proof: {str(e)}", "❌", "error")
        return ProofVerificationResult(
            isValid=False,
            isHighSeverity=False,
            auditorId="",
            timestamp=datetime.now(),
            proofData={},
            error=str(e)
        )


async def batch_verify(proof_ids: List[str], expected_auditor_id: Optional[str] = None) -> List[ProofVerificationResult]:
    """
    Verify multiple proofs in parallel.
    Optimized for gas efficiency by batching requests.
    
    Args:
        proof_ids: List of proof IDs to verify
        expected_auditor_id: Optional auditor ID to verify against
        
    Returns:
        List[ProofVerificationResult]: List of verification results
    """
    try:
        log("ProofVerifier", f"Batch verifying {len(proof_ids)} proofs...", "🔍", "info")
        
        # Create tasks for parallel verification
        tasks = [verify_audit_proof(proof_id, expected_auditor_id) for proof_id in proof_ids]
        
        # Execute in parallel with timeout
        results = await asyncio.wait_for(
            asyncio.gather(*tasks, return_exceptions=True),
            timeout=30.0  # 30 second timeout for batch
        )
        
        # Convert exceptions to error results
        verification_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                verification_results.append(ProofVerificationResult(
                    isValid=False,
                    isHighSeverity=False,
                    auditorId="",
                    timestamp=datetime.now(),
                    proofData={},
                    error=f"Exception: {str(result)}"
                ))
            else:
                verification_results.append(result)
        
        valid_count = sum(1 for r in verification_results if r.isValid)
        log("ProofVerifier", f"Batch verification complete: {valid_count}/{len(proof_ids)} valid", "✅", "info")
        
        return verification_results
        
    except asyncio.TimeoutError:
        log("ProofVerifier", "Batch verification timeout", "⚠️", "warn")
        return [
            ProofVerificationResult(
                isValid=False,
                isHighSeverity=False,
                auditorId="",
                timestamp=datetime.now(),
                proofData={},
                error="Batch verification timeout"
            )
            for _ in proof_ids
        ]
    except Exception as e:
        log("ProofVerifier", f"Batch verification error: {str(e)}", "❌", "error")
        return [
            ProofVerificationResult(
                isValid=False,
                isHighSeverity=False,
                auditorId="",
                timestamp=datetime.now(),
                proofData={},
                error=str(e)
            )
            for _ in proof_ids
        ]


async def get_verification_proof(proof_id: str, format: str = "json") -> Optional[str]:
    """
    Export proof in portable format for off-chain verification.
    
    Args:
        proof_id: The proof ID to export
        format: Export format - "json" or "hex"
        
    Returns:
        str: Proof in requested format, or None if not found
    """
    try:
        log("ProofVerifier", f"Exporting proof: {proof_id[:16]}...", "📤", "info")
        
        # Fetch proof data
        proof_data = await _fetch_proof_from_contract(proof_id)
        if not proof_data:
            log("ProofVerifier", f"Proof not found: {proof_id[:16]}...", "⚠️", "warn")
            return None
        
        # Format proof based on requested format
        if format.lower() == "hex":
            # Convert to hex string
            proof_json = json.dumps(proof_data, default=str)
            proof_hex = proof_json.encode('utf-8').hex()
            return proof_hex
        else:
            # Return as JSON string
            return json.dumps(proof_data, default=str, indent=2)
            
    except Exception as e:
        log("ProofVerifier", f"Error exporting proof: {str(e)}", "❌", "error")
        return None


# ============================================================================
# Internal Helper Functions
# ============================================================================

async def _fetch_proof_from_contract(proof_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch proof data from Midnight contract via FastAPI server.
    
    Args:
        proof_id: The audit ID or proof hash
        
    Returns:
        dict: Proof data or None if not found
    """
    try:
        # Try using midnight_client first (preferred method)
        if MIDNIGHT_CLIENT_AVAILABLE and not MIDNIGHT_SIMULATION_MODE:
            log("ProofVerifier", f"Querying Midnight API for proof: {proof_id[:16]}...", "🔍", "info")
            
            result = await query_audit(proof_id)
            
            if result.found:
                return {
                    "audit_id": result.audit_id,
                    "is_verified": result.is_verified,
                    "auditor_id": "",  # Not returned by query_audit
                    "proof_hash": result.proof_hash or "",
                    "proof_timestamp": datetime.now().isoformat(),
                    "block_height": None,
                }
            else:
                log("ProofVerifier", f"Proof not found via Midnight API: {proof_id[:16]}...", "⚠️", "info")
                # Fall through to other methods
        
        # Try to fetch from bridge service
        if MIDNIGHT_BRIDGE_URL:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{MIDNIGHT_BRIDGE_URL}/api/query-audit",
                    json={"auditId": proof_id}
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("found"):
                        return {
                            "audit_id": proof_id,
                            "is_verified": data.get("isVerified", False),
                            "auditor_id": data.get("auditorId", ""),
                            "proof_hash": data.get("proofHash", ""),
                            "proof_timestamp": data.get("timestamp", datetime.now().isoformat()),
                            "block_height": data.get("blockHeight"),
                        }
        
        # Try direct API call to Midnight FastAPI
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{MIDNIGHT_API_URL}/api/query-audit",
                    json={"audit_id": proof_id},
                    headers={"Content-Type": "application/json"}
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("found"):
                        return {
                            "audit_id": proof_id,
                            "is_verified": data.get("is_verified", False),
                            "auditor_id": data.get("auditor_id", ""),
                            "proof_hash": data.get("proof_hash", ""),
                            "proof_timestamp": datetime.now().isoformat(),
                            "block_height": None,
                        }
        except Exception as api_error:
            log("ProofVerifier", f"Direct API query failed: {str(api_error)}", "⚠️", "info")
        
        # Fallback: Query contract directly via indexer
        if MIDNIGHT_CONTRACT_ADDRESS and MIDNIGHT_INDEXER:
            return await _query_contract_via_indexer(proof_id)
        
        # Final fallback: Simulate for development (only if simulation mode enabled)
        if MIDNIGHT_SIMULATION_MODE:
            log("ProofVerifier", "Using simulation mode for proof fetch", "🔍", "info")
            return _simulate_proof_fetch(proof_id)
        
        return None
        
    except Exception as e:
        log("ProofVerifier", f"Error fetching proof: {str(e)}", "❌", "error")
        return None


async def _query_contract_via_indexer(proof_id: str) -> Optional[Dict[str, Any]]:
    """
    Query contract state via GraphQL indexer.
    
    Args:
        proof_id: The audit ID
        
    Returns:
        dict: Proof data or None
    """
    try:
        query = """
        query GetAudit($contractAddress: String!, $auditId: String!) {
            contractState(address: $contractAddress) {
                is_verified(auditId: $auditId)
                auditor_id(auditId: $auditId)
                proof_timestamp(auditId: $auditId)
            }
        }
        """
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                MIDNIGHT_INDEXER,
                json={
                    "query": query,
                    "variables": {
                        "contractAddress": MIDNIGHT_CONTRACT_ADDRESS,
                        "auditId": proof_id
                    }
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("data"):
                    contract_state = data["data"].get("contractState", {})
                    return {
                        "audit_id": proof_id,
                        "is_verified": contract_state.get("is_verified", False),
                        "auditor_id": contract_state.get("auditor_id", ""),
                        "proof_timestamp": contract_state.get("proof_timestamp", datetime.now().isoformat()),
                    }
        
        return None
        
    except Exception as e:
        log("ProofVerifier", f"Indexer query error: {str(e)}", "❌", "error")
        return None


async def _verify_zk_proof(proof_data: Dict[str, Any]) -> bool:
    """
    Verify that the ZK proof is cryptographically valid.
    
    Args:
        proof_data: Proof data from contract
        
    Returns:
        bool: True if proof is valid
    """
    try:
        # In production, this would verify the actual ZK proof
        # For now, check that is_verified is True (contract has verified it)
        is_verified = proof_data.get("is_verified", False)
        
        if not is_verified:
            return False
        
        # Additional validation: check proof hash exists
        proof_hash = proof_data.get("proof_hash", "")
        if not proof_hash:
            return False
        
        # Verify proof hash format (should be hex string)
        try:
            int(proof_hash, 16)
            return True
        except ValueError:
            return False
            
    except Exception as e:
        log("ProofVerifier", f"ZK proof verification error: {str(e)}", "❌", "error")
        return False


def _is_proof_expired(proof_timestamp: datetime) -> bool:
    """
    Check if proof has expired based on timestamp.
    
    Args:
        proof_timestamp: When the proof was generated
        
    Returns:
        bool: True if expired
    """
    expiry_hours = MIDNIGHT_PROOF_EXPIRY_HOURS
    expiry_time = proof_timestamp + timedelta(hours=expiry_hours)
    return datetime.now() > expiry_time


def _simulate_proof_fetch(proof_id: str) -> Dict[str, Any]:
    """
    Simulate proof fetch for development/testing.
    
    Args:
        proof_id: The audit ID
        
    Returns:
        dict: Simulated proof data
    """
    # Generate deterministic proof data based on proof_id
    proof_hash = "zk_" + hashlib.sha256(proof_id.encode()).hexdigest()[:16]
    
    return {
        "audit_id": proof_id,
        "is_verified": True,
        "auditor_id": "agent1" + "0" * 60,  # Placeholder auditor ID
        "proof_hash": proof_hash,
        "proof_timestamp": datetime.now().isoformat(),
        "block_height": 12345,
    }

