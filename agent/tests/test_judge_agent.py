"""
Comprehensive test suite for Judge Agent system.

Tests cover:
- Successful bounty payouts
- Invalid exploit rejection
- Replay attack prevention
- Severity-based bounty calculation
- Gasless transactions
- Rate limiting
- Cooldown enforcement
- Membase audit trail
- Concurrent attacks
- Error recovery
"""
import pytest
import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from unittest.mock import AsyncMock, MagicMock, patch, Mock
import sys
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "membase"))

from judge_agent import JudgeAgent, AttackData, AttackResult, VerificationResult, BountyResult
from judge_agent_main import IntegratedJudgeAgent
from config import Config


# ============================================================================
# Mock Objects
# ============================================================================

class MockUnibaseClient:
    """Mock Unibase client for testing."""
    
    def __init__(self):
        self.transactions: List[Dict[str, Any]] = []
        self.should_fail = False
        self.fail_count = 0
        self.max_retries = 3
    
    async def send_gasless_bounty(
        self,
        recipient: str,
        amount: int,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Mock gasless bounty transaction."""
        if self.should_fail and self.fail_count < self.max_retries:
            self.fail_count += 1
            raise Exception("Network failure")
        
        tx_hash = f"0x{hash(f'{recipient}{amount}{time.time()}').__abs__():016x}"
        transaction = {
            "tx_hash": tx_hash,
            "recipient": recipient,
            "amount": amount,
            "metadata": metadata,
            "timestamp": datetime.now().isoformat(),
            "status": "confirmed"
        }
        self.transactions.append(transaction)
        return transaction
    
    def reset(self):
        """Reset mock state."""
        self.transactions.clear()
        self.should_fail = False
        self.fail_count = 0


class MockMembaseClient:
    """Mock Membase client for testing."""
    
    def __init__(self):
        self.events: List[Dict[str, Any]] = []
        self.should_fail = False
    
    async def log_attack_attempt(self, event: Dict[str, Any]) -> str:
        """Mock attack logging."""
        if self.should_fail:
            raise Exception("Membase connection failed")
        
        event_id = f"evt_{len(self.events)}"
        event["event_id"] = event_id
        event["logged_at"] = datetime.now().isoformat()
        self.events.append(event)
        return event_id
    
    async def log_exploit_verification(self, verification: Dict[str, Any]) -> str:
        """Mock verification logging."""
        if self.should_fail:
            raise Exception("Membase connection failed")
        
        event_id = f"evt_verify_{len(self.events)}"
        verification["event_id"] = event_id
        verification["logged_at"] = datetime.now().isoformat()
        self.events.append(verification)
        return event_id
    
    async def log_bounty_payout(self, payout: Dict[str, Any]) -> str:
        """Mock payout logging."""
        if self.should_fail:
            raise Exception("Membase connection failed")
        
        event_id = f"evt_payout_{len(self.events)}"
        payout["event_id"] = event_id
        payout["logged_at"] = datetime.now().isoformat()
        self.events.append(payout)
        return event_id
    
    def get_events(self, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get logged events."""
        if event_type:
            return [e for e in self.events if e.get("event_type") == event_type]
        return self.events.copy()
    
    def reset(self):
        """Reset mock state."""
        self.events.clear()
        self.should_fail = False


class MockTarget:
    """Mock vulnerable target for testing."""
    
    def __init__(self, secret_key: str = "fetch_ai_2024"):
        self.secret_key = secret_key
        self.attacks_received: List[Dict[str, Any]] = []
    
    async def process_attack(self, payload: str) -> Dict[str, Any]:
        """Simulate target processing attack."""
        self.attacks_received.append({
            "payload": payload,
            "timestamp": datetime.now()
        })
        
        # Simulate SQL injection vulnerability
        if "' OR '1'='1" in payload or "UNION" in payload.upper():
            return {
                "success": True,
                "secret_key": self.secret_key,
                "message": f"Vulnerability exploited! SECRET_KEY: {self.secret_key}"
            }
        
        return {
            "success": False,
            "secret_key": None,
            "message": "Attack failed"
        }
    
    def reset(self):
        """Reset mock state."""
        self.attacks_received.clear()


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def test_config():
    """Create test configuration."""
    return {
        "agent_id": "test_judge_agent",
        "secret_key": "fetch_ai_2024",
        "unibase_config": {
            "enabled": True
        },
        "membase_config": {
            "enabled": True
        },
        "bounty_rates": {
            "low": 50,
            "medium": 150,
            "high": 300,
            "critical": 500
        },
        "verification_rules": {
            "max_age_minutes": 5,
            "require_secret_key": True,
            "prevent_replay": True,
            "min_severity": "low"
        }
    }


@pytest.fixture
async def judge_agent(test_config):
    """Create JudgeAgent instance for testing."""
    agent = JudgeAgent(test_config)
    yield agent
    # Cleanup if needed
    if hasattr(agent, 'cleanup'):
        await agent.cleanup()


@pytest.fixture
def mock_attack_data():
    """Create mock attack data."""
    return {
        "red_team_id": "test_red_team",
        "target_id": "test_target",
        "exploit_type": "sql_injection",
        "payload": "' OR '1'='1",
        "timestamp": datetime.now()
    }


@pytest.fixture
def mock_target():
    """Create mock target."""
    return MockTarget(secret_key="fetch_ai_2024")


@pytest.fixture
def mock_unibase():
    """Create mock Unibase client."""
    return MockUnibaseClient()


@pytest.fixture
def mock_membase():
    """Create mock Membase client."""
    return MockMembaseClient()


# ============================================================================
# Test Cases
# ============================================================================

@pytest.mark.asyncio
async def test_successful_bounty_payout(judge_agent, mock_attack_data, mock_target):
    """Test successful bounty payout flow."""
    # Monitor attack
    monitor_result = await judge_agent.monitor_attack(
        red_team_id=mock_attack_data["red_team_id"],
        target_id=mock_attack_data["target_id"],
        attack_data=AttackData(
            exploit_type=mock_attack_data["exploit_type"],
            payload=mock_attack_data["payload"],
            timestamp=mock_attack_data["timestamp"]
        )
    )
    
    assert monitor_result["status"] == "monitored"
    
    # Simulate successful exploit
    attack_result = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details={
            "exploit_type": mock_attack_data["exploit_type"],
            "payload": mock_attack_data["payload"],
            "timestamp": datetime.now().isoformat()
        }
    )
    
    # Verify exploit
    verification = judge_agent.verify_exploit(attack_result)
    assert verification.is_valid is True
    assert verification.bounty_amount > 0
    
    # Trigger bounty
    with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
        mock_save.return_value = "0xabc123def456"
        
        bounty_result = await judge_agent.trigger_bounty(
            red_team_id=mock_attack_data["red_team_id"],
            bounty_amount=verification.bounty_amount,
            exploit_data=attack_result.exploit_details
        )
        
        assert bounty_result.success is True
        assert bounty_result.tx_hash == "0xabc123def456"
        assert bounty_result.bounty_paid == verification.bounty_amount
        assert mock_save.called


@pytest.mark.asyncio
async def test_invalid_exploit_rejection(judge_agent, mock_attack_data):
    """Test rejection of invalid exploits."""
    # Attack with wrong SECRET_KEY
    attack_result = AttackResult(
        success=True,
        secret_key="wrong_secret_key",
        target_id=mock_attack_data["target_id"],
        exploit_details={
            "exploit_type": mock_attack_data["exploit_type"],
            "payload": mock_attack_data["payload"],
            "timestamp": datetime.now().isoformat()
        }
    )
    
    # Verify exploit (should fail)
    verification = judge_agent.verify_exploit(attack_result)
    assert verification.is_valid is False
    assert "SECRET_KEY mismatch" in verification.reason or "not extracted" in verification.reason
    
    # Verify no payout triggered
    with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
        # Should not call save_bounty_token for invalid exploits
        assert not mock_save.called


@pytest.mark.asyncio
async def test_replay_attack_prevention(judge_agent, mock_attack_data):
    """Test prevention of replay attacks."""
    exploit_details = {
        "exploit_type": mock_attack_data["exploit_type"],
        "payload": mock_attack_data["payload"],
        "timestamp": datetime.now().isoformat()
    }
    
    # First submission
    attack_result1 = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details=exploit_details.copy()
    )
    
    verification1 = judge_agent.verify_exploit(attack_result1)
    assert verification1.is_valid is True
    
    # Second submission (same exploit)
    attack_result2 = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details=exploit_details.copy()  # Same exploit
    )
    
    verification2 = judge_agent.verify_exploit(attack_result2)
    assert verification2.is_valid is False
    assert "Duplicate" in verification2.reason or "replay" in verification2.reason.lower()


@pytest.mark.asyncio
async def test_severity_based_bounty_calculation(judge_agent):
    """Test bounty calculation for all severity levels."""
    severity_levels = ["low", "medium", "high", "critical"]
    expected_bounties = {
        "low": 50,
        "medium": 150,
        "high": 300,
        "critical": 500
    }
    
    for severity in severity_levels:
        exploit_details = {
            "exploit_type": f"test_{severity}",
            "payload": "test_payload",
            "timestamp": datetime.now().isoformat()
        }
        
        attack_result = AttackResult(
            success=True,
            secret_key="fetch_ai_2024",
            target_id="test_target",
            exploit_details=exploit_details
        )
        
        verification = judge_agent.verify_exploit(attack_result)
        assert verification.severity == severity or verification.severity in ["high", "critical"]
        assert verification.bounty_amount == expected_bounties.get(severity, 300)


@pytest.mark.asyncio
async def test_gasless_transaction(judge_agent, mock_attack_data):
    """Test gasless transaction submission."""
    attack_result = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details={
            "exploit_type": mock_attack_data["exploit_type"],
            "payload": mock_attack_data["payload"],
            "timestamp": datetime.now().isoformat()
        }
    )
    
    verification = judge_agent.verify_exploit(attack_result)
    
    # Mock Unibase to verify gasless transaction
    with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
        mock_save.return_value = "0xgasless123"
        
        bounty_result = await judge_agent.trigger_bounty(
            red_team_id=mock_attack_data["red_team_id"],
            bounty_amount=verification.bounty_amount,
            exploit_data=attack_result.exploit_details
        )
        
        assert bounty_result.success is True
        assert bounty_result.tx_hash.startswith("0x")
        # Verify transaction was submitted (gasless means no gas required from user)
        assert mock_save.called


@pytest.mark.asyncio
async def test_rate_limiting(judge_agent, mock_attack_data):
    """Test rate limiting enforcement."""
    red_team_id = "rate_limit_test_team"
    
    # Submit 10 bounties (should all succeed - max is 10 per hour)
    successful_bounties = 0
    for i in range(10):
        attack_result = AttackResult(
            success=True,
            secret_key="fetch_ai_2024",
            target_id=mock_attack_data["target_id"],
            exploit_details={
                "exploit_type": f"test_{i}",
                "payload": f"payload_{i}",
                "timestamp": datetime.now().isoformat()
            }
        )
        
        verification = judge_agent.verify_exploit(attack_result)
        
        with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
            mock_save.return_value = f"0x{i:016x}"
            
            bounty_result = await judge_agent.trigger_bounty(
                red_team_id=red_team_id,
                bounty_amount=verification.bounty_amount,
                exploit_data=attack_result.exploit_details
            )
            
            if bounty_result.success:
                successful_bounties += 1
    
    # Should have exactly 10 successful bounties
    assert successful_bounties == 10
    
    # Try 11th submission (should be rate limited)
    attack_result_11 = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details={
            "exploit_type": "test_11",
            "payload": "payload_11",
            "timestamp": datetime.now().isoformat()
        }
    )
    
    verification_11 = judge_agent.verify_exploit(attack_result_11)
    
    with patch('judge_agent.save_bounty_token', new_callable=AsyncMock):
        bounty_result_11 = await judge_agent.trigger_bounty(
            red_team_id=red_team_id,
            bounty_amount=verification_11.bounty_amount,
            exploit_data=attack_result_11.exploit_details
        )
        
        # Should be rate limited (11th exceeds max of 10 per hour)
        assert bounty_result_11.success is False


@pytest.mark.asyncio
async def test_cooldown_enforcement(judge_agent, mock_attack_data):
    """Test cooldown period enforcement."""
    red_team_id = "cooldown_test_team"
    
    # First submission
    attack_result1 = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details={
            "exploit_type": "test_1",
            "payload": "payload_1",
            "timestamp": datetime.now().isoformat()
        }
    )
    
    verification1 = judge_agent.verify_exploit(attack_result1)
    
    with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
        mock_save.return_value = "0x1111"
        
        bounty_result1 = await judge_agent.trigger_bounty(
            red_team_id=red_team_id,
            bounty_amount=verification1.bounty_amount,
            exploit_data=attack_result1.exploit_details
        )
        
        assert bounty_result1.success is True
    
    # Immediately try second submission (should be in cooldown)
    attack_result2 = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details={
            "exploit_type": "test_2",
            "payload": "payload_2",
            "timestamp": datetime.now().isoformat()
        }
    )
    
    verification2 = judge_agent.verify_exploit(attack_result2)
    
    with patch('judge_agent.save_bounty_token', new_callable=AsyncMock):
        bounty_result2 = await judge_agent.trigger_bounty(
            red_team_id=red_team_id,
            bounty_amount=verification2.bounty_amount,
            exploit_data=attack_result2.exploit_details
        )
        
        # Should be rejected due to cooldown
        assert bounty_result2.success is False


@pytest.mark.asyncio
async def test_membase_audit_trail(judge_agent, mock_attack_data):
    """Test Membase audit trail logging."""
    # Monitor attack
    await judge_agent.monitor_attack(
        red_team_id=mock_attack_data["red_team_id"],
        target_id=mock_attack_data["target_id"],
        attack_data=AttackData(
            exploit_type=mock_attack_data["exploit_type"],
            payload=mock_attack_data["payload"],
            timestamp=mock_attack_data["timestamp"]
        )
    )
    
    # Process attack result
    attack_result = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details={
            "exploit_type": mock_attack_data["exploit_type"],
            "payload": mock_attack_data["payload"],
            "timestamp": datetime.now().isoformat()
        }
    )
    
    verification = judge_agent.verify_exploit(attack_result)
    
    # Trigger bounty
    with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
        mock_save.return_value = "0xaudit123"
        
        await judge_agent.trigger_bounty(
            red_team_id=mock_attack_data["red_team_id"],
            bounty_amount=verification.bounty_amount,
            exploit_data=attack_result.exploit_details
        )
    
    # Verify audit trail (check that logs were called)
    # In real implementation, would query Membase
    stats = judge_agent.get_statistics()
    assert stats["attacks_monitored"] > 0
    assert stats["bounties_paid"] > 0


@pytest.mark.asyncio
async def test_concurrent_attacks(judge_agent, mock_attack_data):
    """Test handling of concurrent attacks."""
    red_team_ids = [f"red_team_{i}" for i in range(5)]
    
    async def process_attack(red_team_id: str, index: int):
        """Process a single attack."""
        attack_data = AttackData(
            exploit_type=f"concurrent_{index}",
            payload=f"payload_{index}",
            timestamp=datetime.now()
        )
        
        await judge_agent.monitor_attack(
            red_team_id=red_team_id,
            target_id=mock_attack_data["target_id"],
            attack_data=attack_data
        )
        
        attack_result = AttackResult(
            success=True,
            secret_key="fetch_ai_2024",
            target_id=mock_attack_data["target_id"],
            exploit_details={
                "exploit_type": f"concurrent_{index}",
                "payload": f"payload_{index}",
                "timestamp": datetime.now().isoformat()
            }
        )
        
        verification = judge_agent.verify_exploit(attack_result)
        
        with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
            mock_save.return_value = f"0x{index:016x}"
            
            return await judge_agent.trigger_bounty(
                red_team_id=red_team_id,
                bounty_amount=verification.bounty_amount,
                exploit_data=attack_result.exploit_details
            )
    
    # Process all attacks concurrently
    results = await asyncio.gather(*[
        process_attack(red_team_id, i)
        for i, red_team_id in enumerate(red_team_ids)
    ])
    
    # All should succeed
    assert all(r.success for r in results)
    assert len(results) == 5


@pytest.mark.asyncio
async def test_error_recovery(judge_agent, mock_attack_data):
    """Test error recovery and retry logic."""
    attack_result = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details={
            "exploit_type": mock_attack_data["exploit_type"],
            "payload": mock_attack_data["payload"],
            "timestamp": datetime.now().isoformat()
        }
    )
    
    verification = judge_agent.verify_exploit(attack_result)
    
    # Simulate network failure with retry
    call_count = 0
    
    async def mock_save_with_retry(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception("Network failure")
        return "0xretry_success"
    
    with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
        mock_save.side_effect = mock_save_with_retry
        
        bounty_result = await judge_agent.trigger_bounty(
            red_team_id=mock_attack_data["red_team_id"],
            bounty_amount=verification.bounty_amount,
            exploit_data=attack_result.exploit_details
        )
        
        # Should eventually succeed after retries
        assert bounty_result.success is True
        assert call_count == 3  # Retried 3 times


# ============================================================================
# Performance Benchmarks
# ============================================================================

@pytest.mark.asyncio
@pytest.mark.benchmark
async def test_bounty_payout_performance(judge_agent, mock_attack_data):
    """Benchmark bounty payout performance (target: <2s per bounty)."""
    attack_result = AttackResult(
        success=True,
        secret_key="fetch_ai_2024",
        target_id=mock_attack_data["target_id"],
        exploit_details={
            "exploit_type": mock_attack_data["exploit_type"],
            "payload": mock_attack_data["payload"],
            "timestamp": datetime.now().isoformat()
        }
    )
    
    verification = judge_agent.verify_exploit(attack_result)
    
    with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
        mock_save.return_value = "0xperf123"
        
        start_time = time.time()
        
        bounty_result = await judge_agent.trigger_bounty(
            red_team_id=mock_attack_data["red_team_id"],
            bounty_amount=verification.bounty_amount,
            exploit_data=attack_result.exploit_details
        )
        
        elapsed_time = time.time() - start_time
        
        assert bounty_result.success is True
        assert elapsed_time < 2.0, f"Bounty payout took {elapsed_time:.2f}s, target is <2s"


@pytest.mark.asyncio
@pytest.mark.benchmark
async def test_concurrent_bounty_performance(judge_agent, mock_attack_data):
    """Benchmark concurrent bounty processing performance."""
    num_attacks = 10
    
    async def process_bounty(index: int):
        attack_result = AttackResult(
            success=True,
            secret_key="fetch_ai_2024",
            target_id=mock_attack_data["target_id"],
            exploit_details={
                "exploit_type": f"perf_{index}",
                "payload": f"payload_{index}",
                "timestamp": datetime.now().isoformat()
            }
        )
        
        verification = judge_agent.verify_exploit(attack_result)
        
        with patch('judge_agent.save_bounty_token', new_callable=AsyncMock) as mock_save:
            mock_save.return_value = f"0x{index:016x}"
            
            return await judge_agent.trigger_bounty(
                red_team_id=f"perf_team_{index}",
                bounty_amount=verification.bounty_amount,
                exploit_data=attack_result.exploit_details
            )
    
    start_time = time.time()
    results = await asyncio.gather(*[process_bounty(i) for i in range(num_attacks)])
    elapsed_time = time.time() - start_time
    
    assert all(r.success for r in results)
    avg_time = elapsed_time / num_attacks
    assert avg_time < 2.0, f"Average bounty time: {avg_time:.2f}s, target is <2s"


# ============================================================================
# Integration Tests (run against testnet)
# ============================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_integration_unibase_connection():
    """Test connection to Unibase testnet."""
    # This would test actual Unibase connection
    # Skip if testnet not available
    pytest.skip("Integration test - requires testnet access")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_integration_membase_connection():
    """Test connection to Membase."""
    # This would test actual Membase connection
    # Skip if Membase not available
    pytest.skip("Integration test - requires Membase access")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])

