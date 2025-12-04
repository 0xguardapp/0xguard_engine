"""
Unit tests for proof verification functionality.
Tests all verification methods with edge cases.
"""
import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
import sys
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from proof_verifier import (
    verify_audit_proof,
    batch_verify,
    get_verification_proof,
    ProofVerificationResult,
    _fetch_proof_from_contract,
    _verify_zk_proof,
    _is_proof_expired,
    _simulate_proof_fetch
)


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def sample_proof_id():
    """Sample proof ID for testing."""
    return "test_audit_id_1234567890abcdef"


@pytest.fixture
def sample_proof_data():
    """Sample proof data from contract."""
    return {
        "audit_id": "test_audit_id_1234567890abcdef",
        "is_verified": True,
        "auditor_id": "agent1" + "0" * 60,
        "proof_hash": "zk_704cd1a54571c7d4",
        "proof_timestamp": datetime.now().isoformat(),
        "block_height": 12345,
    }


@pytest.fixture
def expired_proof_data():
    """Expired proof data for testing."""
    expired_time = datetime.now() - timedelta(hours=25)
    return {
        "audit_id": "expired_audit_id",
        "is_verified": True,
        "auditor_id": "agent1" + "0" * 60,
        "proof_hash": "zk_expired123456",
        "proof_timestamp": expired_time.isoformat(),
        "block_height": 10000,
    }


# ============================================================================
# Test verify_audit_proof
# ============================================================================

@pytest.mark.asyncio
async def test_verify_audit_proof_success(sample_proof_id, sample_proof_data):
    """Test successful proof verification."""
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = sample_proof_data
        
        result = await verify_audit_proof(sample_proof_id)
        
        assert result.isValid is True
        assert result.isHighSeverity is True
        assert result.auditorId == sample_proof_data["auditor_id"]
        assert result.error is None
        assert "audit_id" in result.proofData


@pytest.mark.asyncio
async def test_verify_audit_proof_not_found(sample_proof_id):
    """Test verification when proof is not found."""
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = None
        
        result = await verify_audit_proof(sample_proof_id)
        
        assert result.isValid is False
        assert result.error == "Proof not found on contract"


@pytest.mark.asyncio
async def test_verify_audit_proof_invalid_zk(sample_proof_id):
    """Test verification when ZK proof is invalid."""
    invalid_proof = {
        "audit_id": sample_proof_id,
        "is_verified": False,  # Invalid - not verified
        "auditor_id": "agent1" + "0" * 60,
        "proof_hash": "zk_invalid",
        "proof_timestamp": datetime.now().isoformat(),
    }
    
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = invalid_proof
        
        result = await verify_audit_proof(sample_proof_id)
        
        assert result.isValid is False
        assert result.error == "ZK proof verification failed"


@pytest.mark.asyncio
async def test_verify_audit_proof_auditor_mismatch(sample_proof_id, sample_proof_data):
    """Test verification when auditor ID doesn't match."""
    expected_auditor = "different_auditor_id"
    
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = sample_proof_data
        
        result = await verify_audit_proof(sample_proof_id, expected_auditor)
        
        assert result.isValid is True  # Proof is valid
        assert "Auditor ID mismatch" in result.error


@pytest.mark.asyncio
async def test_verify_audit_proof_expired(expired_proof_data):
    """Test verification of expired proof."""
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = expired_proof_data
        
        result = await verify_audit_proof(expired_proof_data["audit_id"])
        
        assert result.isValid is True  # Proof is still valid
        assert result.error == "Proof has expired"


@pytest.mark.asyncio
async def test_verify_audit_proof_network_timeout(sample_proof_id):
    """Test handling of network timeout."""
    import httpx
    
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.side_effect = httpx.TimeoutException("Request timeout")
        
        result = await verify_audit_proof(sample_proof_id)
        
        assert result.isValid is False
        assert result.error == "Network timeout"


@pytest.mark.asyncio
async def test_verify_audit_proof_invalid_proof_id():
    """Test verification with invalid proof ID."""
    invalid_id = ""
    
    result = await verify_audit_proof(invalid_id)
    
    # Should handle gracefully
    assert isinstance(result, ProofVerificationResult)


# ============================================================================
# Test batch_verify
# ============================================================================

@pytest.mark.asyncio
async def test_batch_verify_success(sample_proof_data):
    """Test successful batch verification."""
    proof_ids = ["proof1", "proof2", "proof3"]
    
    with patch('proof_verifier.verify_audit_proof', new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = ProofVerificationResult(
            isValid=True,
            isHighSeverity=True,
            auditorId="auditor1",
            timestamp=datetime.now(),
            proofData=sample_proof_data
        )
        
        results = await batch_verify(proof_ids)
        
        assert len(results) == 3
        assert all(r.isValid for r in results)
        assert mock_verify.call_count == 3


@pytest.mark.asyncio
async def test_batch_verify_mixed_results(sample_proof_data):
    """Test batch verification with mixed success/failure."""
    proof_ids = ["proof1", "proof2", "proof3"]
    
    def mock_verify_side_effect(proof_id, *args):
        if proof_id == "proof2":
            return ProofVerificationResult(
                isValid=False,
                isHighSeverity=False,
                auditorId="",
                timestamp=datetime.now(),
                proofData={},
                error="Proof not found"
            )
        return ProofVerificationResult(
            isValid=True,
            isHighSeverity=True,
            auditorId="auditor1",
            timestamp=datetime.now(),
            proofData=sample_proof_data
        )
    
    with patch('proof_verifier.verify_audit_proof', new_callable=AsyncMock) as mock_verify:
        mock_verify.side_effect = mock_verify_side_effect
        
        results = await batch_verify(proof_ids)
        
        assert len(results) == 3
        assert results[0].isValid is True
        assert results[1].isValid is False
        assert results[2].isValid is True


@pytest.mark.asyncio
async def test_batch_verify_timeout():
    """Test batch verification timeout handling."""
    proof_ids = ["proof1", "proof2"]
    
    async def slow_verify(*args):
        await asyncio.sleep(35)  # Longer than timeout
        return ProofVerificationResult(
            isValid=True,
            isHighSeverity=True,
            auditorId="auditor1",
            timestamp=datetime.now(),
            proofData={}
        )
    
    with patch('proof_verifier.verify_audit_proof', new_callable=AsyncMock) as mock_verify:
        mock_verify.side_effect = slow_verify
        
        results = await batch_verify(proof_ids)
        
        # Should return timeout errors
        assert len(results) == 2
        assert all(not r.isValid for r in results)
        assert all("timeout" in r.error.lower() for r in results)


@pytest.mark.asyncio
async def test_batch_verify_empty_list():
    """Test batch verification with empty list."""
    results = await batch_verify([])
    
    assert len(results) == 0


@pytest.mark.asyncio
async def test_batch_verify_large_batch(sample_proof_data):
    """Test batch verification with large number of proofs."""
    proof_ids = [f"proof{i}" for i in range(100)]
    
    with patch('proof_verifier.verify_audit_proof', new_callable=AsyncMock) as mock_verify:
        mock_verify.return_value = ProofVerificationResult(
            isValid=True,
            isHighSeverity=True,
            auditorId="auditor1",
            timestamp=datetime.now(),
            proofData=sample_proof_data
        )
        
        results = await batch_verify(proof_ids)
        
        assert len(results) == 100
        assert all(r.isValid for r in results)


# ============================================================================
# Test get_verification_proof
# ============================================================================

@pytest.mark.asyncio
async def test_get_verification_proof_json(sample_proof_id, sample_proof_data):
    """Test exporting proof as JSON."""
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = sample_proof_data
        
        proof = await get_verification_proof(sample_proof_id, "json")
        
        assert proof is not None
        import json
        proof_data = json.loads(proof)
        assert proof_data["audit_id"] == sample_proof_id


@pytest.mark.asyncio
async def test_get_verification_proof_hex(sample_proof_id, sample_proof_data):
    """Test exporting proof as hex string."""
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = sample_proof_data
        
        proof = await get_verification_proof(sample_proof_id, "hex")
        
        assert proof is not None
        # Should be valid hex
        int(proof, 16)  # Should not raise ValueError


@pytest.mark.asyncio
async def test_get_verification_proof_not_found(sample_proof_id):
    """Test exporting non-existent proof."""
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = None
        
        proof = await get_verification_proof(sample_proof_id)
        
        assert proof is None


@pytest.mark.asyncio
async def test_get_verification_proof_invalid_format(sample_proof_id, sample_proof_data):
    """Test exporting with invalid format (defaults to JSON)."""
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = sample_proof_data
        
        proof = await get_verification_proof(sample_proof_id, "invalid")
        
        # Should default to JSON
        assert proof is not None
        import json
        json.loads(proof)  # Should be valid JSON


# ============================================================================
# Test Helper Functions
# ============================================================================

@pytest.mark.asyncio
async def test_fetch_proof_from_contract_success(sample_proof_id, sample_proof_data):
    """Test fetching proof from contract."""
    with patch('proof_verifier._simulate_proof_fetch') as mock_simulate:
        mock_simulate.return_value = sample_proof_data
        
        result = await _fetch_proof_from_contract(sample_proof_id)
        
        assert result is not None
        assert result["audit_id"] == sample_proof_id


@pytest.mark.asyncio
async def test_fetch_proof_from_contract_not_found(sample_proof_id):
    """Test fetching non-existent proof."""
    with patch('proof_verifier._simulate_proof_fetch') as mock_simulate:
        mock_simulate.return_value = None
        
        result = await _fetch_proof_from_contract(sample_proof_id)
        
        assert result is None


def test_verify_zk_proof_valid(sample_proof_data):
    """Test ZK proof verification with valid proof."""
    result = _verify_zk_proof(sample_proof_data)
    
    assert result is True


def test_verify_zk_proof_invalid():
    """Test ZK proof verification with invalid proof."""
    invalid_proof = {
        "is_verified": False,
        "proof_hash": ""
    }
    
    result = _verify_zk_proof(invalid_proof)
    
    assert result is False


def test_verify_zk_proof_missing_hash():
    """Test ZK proof verification with missing hash."""
    proof_no_hash = {
        "is_verified": True,
        "proof_hash": ""
    }
    
    result = _verify_zk_proof(proof_no_hash)
    
    assert result is False


def test_is_proof_expired():
    """Test proof expiry check."""
    expired_time = datetime.now() - timedelta(hours=25)
    
    assert _is_proof_expired(expired_time) is True


def test_is_proof_not_expired():
    """Test proof not expired check."""
    recent_time = datetime.now() - timedelta(hours=1)
    
    assert _is_proof_expired(recent_time) is False


def test_simulate_proof_fetch(sample_proof_id):
    """Test proof simulation."""
    result = _simulate_proof_fetch(sample_proof_id)
    
    assert result is not None
    assert result["audit_id"] == sample_proof_id
    assert result["is_verified"] is True
    assert "proof_hash" in result


# ============================================================================
# Test Edge Cases
# ============================================================================

@pytest.mark.asyncio
async def test_verify_with_contract_upgrade_scenario(sample_proof_id):
    """Test handling of contract upgrade scenario."""
    # Simulate contract returning upgrade notice
    upgrade_proof = {
        "audit_id": sample_proof_id,
        "is_verified": True,
        "auditor_id": "agent1" + "0" * 60,
        "proof_hash": "zk_upgrade123",
        "proof_timestamp": datetime.now().isoformat(),
        "contract_version": "2.0",  # New field indicating upgrade
    }
    
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = upgrade_proof
        
        result = await verify_audit_proof(sample_proof_id)
        
        # Should still verify successfully
        assert result.isValid is True
        assert "contract_version" in result.proofData


@pytest.mark.asyncio
async def test_verify_with_malformed_proof_data(sample_proof_id):
    """Test handling of malformed proof data."""
    malformed_proof = {
        "audit_id": sample_proof_id,
        # Missing required fields
    }
    
    with patch('proof_verifier._fetch_proof_from_contract', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = malformed_proof
        
        result = await verify_audit_proof(sample_proof_id)
        
        # Should handle gracefully
        assert isinstance(result, ProofVerificationResult)
        assert result.isValid is False


@pytest.mark.asyncio
async def test_batch_verify_with_exceptions(sample_proof_id):
    """Test batch verification with exceptions."""
    proof_ids = ["proof1", "proof2"]
    
    def mock_verify_side_effect(proof_id, *args):
        if proof_id == "proof1":
            raise ValueError("Test exception")
        return ProofVerificationResult(
            isValid=True,
            isHighSeverity=True,
            auditorId="auditor1",
            timestamp=datetime.now(),
            proofData={}
        )
    
    with patch('proof_verifier.verify_audit_proof', new_callable=AsyncMock) as mock_verify:
        mock_verify.side_effect = mock_verify_side_effect
        
        results = await batch_verify(proof_ids)
        
        assert len(results) == 2
        assert results[0].isValid is False
        assert "Exception" in results[0].error
        assert results[1].isValid is True


# ============================================================================
# Test ProofVerificationResult
# ============================================================================

def test_proof_verification_result_to_dict():
    """Test ProofVerificationResult serialization."""
    result = ProofVerificationResult(
        isValid=True,
        isHighSeverity=True,
        auditorId="auditor1",
        timestamp=datetime.now(),
        proofData={"test": "data"}
    )
    
    result_dict = result.to_dict()
    
    assert result_dict["isValid"] is True
    assert result_dict["isHighSeverity"] is True
    assert result_dict["auditorId"] == "auditor1"
    assert "timestamp" in result_dict
    assert result_dict["proofData"]["test"] == "data"


def test_proof_verification_result_with_error():
    """Test ProofVerificationResult with error."""
    result = ProofVerificationResult(
        isValid=False,
        isHighSeverity=False,
        auditorId="",
        timestamp=datetime.now(),
        proofData={},
        error="Test error"
    )
    
    result_dict = result.to_dict()
    
    assert result_dict["isValid"] is False
    assert result_dict["error"] == "Test error"


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

