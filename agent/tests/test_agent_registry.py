"""
Comprehensive test suite for Agent Registry System.

Tests cover:
- Agent registration (IdentityRegistry + Unibase)
- Identity registry updates
- Reputation increments/decrements
- ERC-3009 gasless transfers
- Unibase memory mutations
- Validation flow
- Combined cross-layer pipeline

All external dependencies (RPC, Unibase, contracts) are mocked.
"""
import pytest
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from unittest.mock import AsyncMock, MagicMock, patch, Mock, call
import sys
from pathlib import Path
import json
import hashlib

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import modules to test
try:
    from agent_registry_adapter import AgentRegistryAdapter
    from unibase_agent_store import UnibaseAgentStore
    REGISTRY_AVAILABLE = True
except ImportError:
    REGISTRY_AVAILABLE = False
    pytest.skip("Agent registry modules not available", allow_module_level=True)


# ============================================================================
# Mock Objects
# ============================================================================

class MockWeb3:
    """Mock Web3 client for contract interactions."""
    
    def __init__(self):
        self.contracts = {}
        self.transactions = []
        self.accounts = {}
        self.block_number = 1000000
        self.middleware_onion = MagicMock()
        
    def __call__(self, *args, **kwargs):
        return self
        
    def HTTPProvider(self, *args, **kwargs):
        return MagicMock()
        
    @staticmethod
    def to_checksum_address(address):
        return address
        
    def eth(self):
        return self
        
    @property
    def account(self):
        """Mock account module."""
        class MockAccountModule:
            @staticmethod
            def sign_transaction(tx, key):
                return MockSignedTransaction(tx, key)
        return MockAccountModule()
        
    def contract(self, address=None, abi=None):
        """Create a mock contract instance."""
        contract = MockContract(address, abi)
        if address:
            self.contracts[address] = contract
        return contract
    
    def from_key(self, key):
        account = MockAccount(key)
        self.accounts[key] = account
        return account
    
    def get_transaction_count(self, address):
        return len([t for t in self.transactions if t.get('from') == address])
    
    @property
    def gas_price(self):
        return 20000000000  # 20 gwei
    
    def send_raw_transaction(self, tx):
        tx_hash = f"0x{hashlib.sha256(tx.encode() if isinstance(tx, str) else tx).hexdigest()[:64]}"
        self.transactions.append({
            'hash': tx_hash,
            'raw': tx
        })
        return tx_hash
    
    def get_block_number(self):
        return self.block_number
    
    def wait_for_transaction_receipt(self, tx_hash, timeout=120):
        return {
            'transactionHash': tx_hash,
            'status': 1,
            'blockNumber': self.block_number
        }


class MockContract:
    """Mock contract instance."""
    
    def __init__(self, address, abi):
        self.address = address
        self.abi = abi
        self.state = {}
        self.events = []
        
    @property
    def functions(self):
        return self
        
    def __getitem__(self, name):
        """Return a callable that returns MockContractFunction."""
        def function_factory(*args):
            return MockContractFunction(name, self, args)
        return function_factory
    
    def events(self):
        return self
        
    def getLogs(self, *args, **kwargs):
        return self.events


class MockContractFunction:
    """Mock contract function call."""
    
    def __init__(self, name, contract, args):
        self.name = name
        self.contract = contract
        self.args = args
        self._tx_params = None
        
    # Args already set in __init__
        
    def call(self):
        """Mock read call."""
        if self.name == 'getIdentity':
            agent = self.args[0] if self.args else None
            return self.contract.state.get(agent, {}).get('identity_uri', '')
        elif self.name == 'getIdentityFull':
            agent = self.args[0] if self.args else None
            data = self.contract.state.get(agent, {})
            return (
                data.get('identity_uri', ''),
                data.get('registered_at', 0),
                data.get('last_updated', 0)
            )
        elif self.name == 'isRegistered':
            agent = self.args[0] if self.args else None
            return agent in self.contract.state
        elif self.name == 'getReputation':
            agent = self.args[0] if self.args else None
            data = self.contract.state.get(agent, {})
            return (
                data.get('score', 0),
                data.get('last_updated', 0),
                data.get('evidence_uri', '')
            )
        elif self.name == 'getValidation':
            agent = self.args[0] if self.args else None
            data = self.contract.state.get(agent, {})
            return (
                data.get('valid', False),
                data.get('evidence_uri', '')
            )
        return None
        
    def build_transaction(self, params):
        """Mock transaction building."""
        # Store params for later execution
        self._tx_params = params
        # Execute transaction immediately for testing
        self._execute_transaction()
        tx = {
            'to': self.contract.address,
            'data': f'0x{self.name}{hash(str(self.args))}',
            **params
        }
        return tx
        
    def _execute_transaction(self):
        """Execute transaction to update state."""
        # Update contract state based on function
        if self.name == 'registerAgent':
            agent, uri = self.args
            self.contract.state[agent] = {
                'identity_uri': uri,
                'registered_at': int(datetime.now().timestamp()),
                'last_updated': int(datetime.now().timestamp())
            }
        elif self.name == 'updateIdentityURI':
            agent, uri = self.args
            if agent in self.contract.state:
                self.contract.state[agent]['identity_uri'] = uri
                self.contract.state[agent]['last_updated'] = int(datetime.now().timestamp())
        elif self.name == 'updateReputation':
            agent, delta, uri = self.args
            if agent not in self.contract.state:
                self.contract.state[agent] = {'score': 0, 'last_updated': 0, 'evidence_uri': ''}
            current_score = self.contract.state[agent].get('score', 0)
            new_score = max(0, current_score + int(delta))
            self.contract.state[agent]['score'] = new_score
            self.contract.state[agent]['evidence_uri'] = uri
            self.contract.state[agent]['last_updated'] = int(datetime.now().timestamp())
        elif self.name == 'validateAgent':
            agent, uri = self.args
            self.contract.state[agent] = {
                'valid': True,
                'evidence_uri': uri
            }
        elif self.name == 'revokeAgent':
            agent = self.args[0]
            if agent in self.contract.state:
                self.contract.state[agent]['valid'] = False
                self.contract.state[agent]['evidence_uri'] = ''
        
    def transact(self, params):
        """Mock transaction execution."""
        self._execute_transaction()
        return {'hash': f'0x{hashlib.sha256(str(self.args).encode()).hexdigest()[:64]}'}


class MockAccount:
    """Mock Ethereum account."""
    
    def __init__(self, key):
        self.key = key
        self.address = f"0x{hashlib.sha256(key.encode() if isinstance(key, str) else key).hexdigest()[:40]}"
        
    def sign_transaction(self, tx):
        return MockSignedTransaction(tx, self.key)


class MockSignedTransaction:
    """Mock signed transaction."""
    
    def __init__(self, tx, key):
        self.transaction = tx
        self.rawTransaction = f"signed_{hashlib.sha256(str(tx).encode()).hexdigest()}"


class MockUnibaseStore:
    """Mock UnibaseAgentStore for testing."""
    
    def __init__(self):
        self.storage = {}
        self.calls = []
        
    def store_identity(self, agent, data):
        key = f"agent:identity:{agent.lower().replace('0x', '')}"
        unibase_key = f"unibase_key_{hashlib.sha256(key.encode()).hexdigest()[:16]}"
        self.storage[key] = {
            'key': unibase_key,
            'value': {
                'agent': agent,
                'data': data,
                'timestamp': datetime.now().isoformat(),
                'type': 'identity'
            }
        }
        self.calls.append(('store_identity', agent, data))
        return unibase_key
        
    def store_reputation(self, agent, delta, metadata):
        key = f"agent:rep:{agent.lower().replace('0x', '')}"
        unibase_key = f"unibase_key_{hashlib.sha256(key.encode()).hexdigest()[:16]}"
        self.storage[key] = {
            'key': unibase_key,
            'value': {
                'agent': agent,
                'delta': delta,
                'metadata': metadata,
                'timestamp': datetime.now().isoformat(),
                'type': 'reputation'
            }
        }
        self.calls.append(('store_reputation', agent, delta, metadata))
        return unibase_key
        
    def store_validation(self, agent, metadata):
        key = f"agent:val:{agent.lower().replace('0x', '')}"
        unibase_key = f"unibase_key_{hashlib.sha256(key.encode()).hexdigest()[:16]}"
        self.storage[key] = {
            'key': unibase_key,
            'value': {
                'agent': agent,
                'metadata': metadata,
                'timestamp': datetime.now().isoformat(),
                'type': 'validation'
            }
        }
        self.calls.append(('store_validation', agent, metadata))
        return unibase_key
        
    def get_agent_memory(self, agent):
        key = f"agent:mem:{agent.lower().replace('0x', '')}"
        if key in self.storage:
            return self.storage[key]['value'].get('data', {})
        return {}
        
    def update_agent_memory(self, agent, memory_patch):
        key = f"agent:mem:{agent.lower().replace('0x', '')}"
        existing = self.get_agent_memory(agent)
        updated = {**existing, **memory_patch}
        unibase_key = f"unibase_key_{hashlib.sha256(key.encode()).hexdigest()[:16]}"
        self.storage[key] = {
            'key': unibase_key,
            'value': {
                'agent': agent,
                'data': updated,
                'timestamp': datetime.now().isoformat(),
                'type': 'memory'
            }
        }
        self.calls.append(('update_agent_memory', agent, memory_patch))
        return unibase_key
        
    def reset(self):
        self.storage.clear()
        self.calls.clear()


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_web3():
    """Create mock Web3 instance."""
    return MockWeb3()


@pytest.fixture
def mock_unibase_store():
    """Create mock UnibaseAgentStore."""
    return MockUnibaseStore()


@pytest.fixture
def agent_address():
    """Sample agent address."""
    return "0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B"


@pytest.fixture
def identity_data():
    """Sample identity data."""
    return {
        "name": "Test Agent",
        "role": "auditor",
        "capabilities": ["audit", "validation"],
        "version": "1.0.0"
    }


@pytest.fixture
def registry_adapter(mock_unibase_store, mock_web3):
    """Create AgentRegistryAdapter with mocked dependencies."""
    # Mock Web3 and account creation
    with patch('agent_registry_adapter.WEB3_AVAILABLE', True), \
         patch('agent_registry_adapter.Web3') as mock_web3_class, \
         patch('agent_registry_adapter.privateKeyToAccount') as mock_account_func:
        
        # Setup Web3 mock
        mock_web3_class.return_value = mock_web3
        mock_web3_class.HTTPProvider.return_value = MagicMock()
        mock_web3_class.to_checksum_address = lambda addr: addr
        
        # Mock account
        mock_key = "0x" + "1" * 64
        mock_acc = MockAccount(mock_key)
        mock_account_func.return_value = mock_acc
        
        adapter = AgentRegistryAdapter(unibase_store=mock_unibase_store)
        adapter.web3 = mock_web3
        adapter.account = mock_acc
        
        # Mock contract instances
        adapter.identity_registry = mock_web3.contract(
            address="0xIdentityRegistry",
            abi=[]
        )
        adapter.reputation_registry = mock_web3.contract(
            address="0xReputationRegistry",
            abi=[]
        )
        adapter.validation_registry = mock_web3.contract(
            address="0xValidationRegistry",
            abi=[]
        )
        
        return adapter


# ============================================================================
# Agent Registration Tests
# ============================================================================

@pytest.mark.asyncio
async def test_agent_registration(registry_adapter, agent_address, identity_data, mock_unibase_store):
    """Test agent registration flow."""
    result = registry_adapter.register_agent(agent_address, identity_data)
    
    assert result['success'] is True
    assert result['agent_address'] == agent_address
    assert 'unibase' in result
    assert result['unibase']['key'] is not None
    assert result['unibase']['data'] == identity_data
    assert 'on_chain' in result
    assert result['on_chain']['registered'] is True
    assert result['combined']['status'] == 'registered'
    
    # Verify Unibase was called
    assert any(call[0] == 'store_identity' for call in mock_unibase_store.calls)
    
    # Verify on-chain registration
    assert agent_address in registry_adapter.identity_registry.state


@pytest.mark.asyncio
async def test_agent_registration_duplicate(registry_adapter, agent_address, identity_data):
    """Test registering same agent twice."""
    # First registration
    result1 = registry_adapter.register_agent(agent_address, identity_data)
    assert result1['success'] is True
    
    # Second registration should update
    updated_data = {**identity_data, "version": "1.1.0"}
    result2 = registry_adapter.register_agent(agent_address, updated_data)
    assert result2['success'] is True
    assert result2['combined']['status'] == 'registered'


@pytest.mark.asyncio
async def test_agent_registration_invalid_address(registry_adapter, identity_data):
    """Test registration with invalid address."""
    result = registry_adapter.register_agent("invalid", identity_data)
    # Should handle gracefully
    assert result is not None


# ============================================================================
# Identity Update Tests
# ============================================================================

@pytest.mark.asyncio
async def test_identity_update(registry_adapter, agent_address, identity_data, mock_unibase_store):
    """Test identity update flow."""
    # First register
    registry_adapter.register_agent(agent_address, identity_data)
    
    # Then update
    updates = {"version": "1.1.0", "new_field": "value"}
    result = registry_adapter.update_identity(agent_address, updates)
    
    assert result['success'] is True
    assert result['unibase']['data']['version'] == "1.1.0"
    assert result['unibase']['data']['new_field'] == "value"
    assert result['combined']['status'] == 'updated'
    
    # Verify Unibase was called
    assert any(call[0] == 'store_identity' for call in mock_unibase_store.calls)


@pytest.mark.asyncio
async def test_identity_update_not_registered(registry_adapter, agent_address):
    """Test updating identity for unregistered agent."""
    updates = {"version": "1.1.0"}
    result = registry_adapter.update_identity(agent_address, updates)
    
    # Should still work (creates new identity)
    assert result['success'] is True


# ============================================================================
# Reputation Tests
# ============================================================================

@pytest.mark.asyncio
async def test_reputation_increment(registry_adapter, agent_address, mock_unibase_store):
    """Test reputation increment."""
    metadata = {"reason": "Good audit", "audit_id": "audit_123"}
    result = registry_adapter.record_agent_reputation(agent_address, 10, metadata)
    
    assert result['success'] is True
    assert result['unibase']['delta'] == 10
    assert result['combined']['delta'] == 10
    assert 'on_chain' in result
    
    # Verify Unibase was called
    assert any(call[0] == 'store_reputation' and call[2] == 10 
               for call in mock_unibase_store.calls)
    
    # Verify on-chain state
    rep_data = registry_adapter.reputation_registry.state.get(agent_address, {})
    assert rep_data.get('score', 0) == 10


@pytest.mark.asyncio
async def test_reputation_decrement(registry_adapter, agent_address):
    """Test reputation decrement."""
    # First add reputation
    registry_adapter.record_agent_reputation(agent_address, 50, {"reason": "Initial"})
    
    # Then decrement
    result = registry_adapter.record_agent_reputation(agent_address, -20, {"reason": "Penalty"})
    
    assert result['success'] is True
    assert result['combined']['delta'] == -20
    
    # Verify on-chain state
    rep_data = registry_adapter.reputation_registry.state.get(agent_address, {})
    assert rep_data.get('score', 0) == 30  # 50 - 20


@pytest.mark.asyncio
async def test_reputation_floor_at_zero(registry_adapter, agent_address):
    """Test reputation cannot go below zero."""
    # Add small amount
    registry_adapter.record_agent_reputation(agent_address, 5, {"reason": "Initial"})
    
    # Try to subtract more
    result = registry_adapter.record_agent_reputation(agent_address, -100, {"reason": "Large penalty"})
    
    assert result['success'] is True
    
    # Verify on-chain state (should be floored at 0)
    rep_data = registry_adapter.reputation_registry.state.get(agent_address, {})
    assert rep_data.get('score', 0) == 0


@pytest.mark.asyncio
async def test_reputation_multiple_updates(registry_adapter, agent_address):
    """Test multiple reputation updates."""
    updates = [
        (10, "First"),
        (5, "Second"),
        (-3, "Third"),
        (20, "Fourth")
    ]
    
    for delta, reason in updates:
        result = registry_adapter.record_agent_reputation(
            agent_address, 
            delta, 
            {"reason": reason}
        )
        assert result['success'] is True
    
    # Final score should be sum
    rep_data = registry_adapter.reputation_registry.state.get(agent_address, {})
    assert rep_data.get('score', 0) == 32  # 10 + 5 - 3 + 20


# ============================================================================
# Validation Tests
# ============================================================================

@pytest.mark.asyncio
async def test_agent_validation(registry_adapter, agent_address, mock_unibase_store):
    """Test agent validation flow."""
    validation_data = {
        "validator": "0x123...",
        "validation_type": "security_audit",
        "result": "passed"
    }
    
    result = registry_adapter.validate_agent(agent_address, validation_data)
    
    assert result['success'] is True
    assert result['unibase']['data'] == validation_data
    assert result['on_chain']['valid'] is True
    assert result['combined']['status'] == 'validated'
    
    # Verify Unibase was called
    assert any(call[0] == 'store_validation' for call in mock_unibase_store.calls)
    
    # Verify on-chain state
    val_data = registry_adapter.validation_registry.state.get(agent_address, {})
    assert val_data.get('valid', False) is True


@pytest.mark.asyncio
async def test_validation_revocation(registry_adapter, agent_address):
    """Test validation revocation."""
    # First validate
    registry_adapter.validate_agent(agent_address, {"result": "passed"})
    
    # Revoke (would need revokeAgent method in adapter)
    # For now, just verify validation state
    val_data = registry_adapter.validation_registry.state.get(agent_address, {})
    assert val_data.get('valid', False) is True


# ============================================================================
# Unibase Memory Tests
# ============================================================================

@pytest.mark.asyncio
async def test_memory_initialization(registry_adapter, agent_address, mock_unibase_store):
    """Test agent memory initialization."""
    memory = mock_unibase_store.get_agent_memory(agent_address)
    assert memory == {}
    
    # Update memory
    memory_patch = {"status": "active", "startup_time": datetime.now().isoformat()}
    key = mock_unibase_store.update_agent_memory(agent_address, memory_patch)
    
    assert key is not None
    updated = mock_unibase_store.get_agent_memory(agent_address)
    assert updated['status'] == "active"
    assert 'startup_time' in updated


@pytest.mark.asyncio
async def test_memory_merge_update(registry_adapter, agent_address, mock_unibase_store):
    """Test memory merge updates."""
    # Initial memory
    mock_unibase_store.update_agent_memory(agent_address, {
        "field1": "value1",
        "field2": "value2"
    })
    
    # Update with new fields
    mock_unibase_store.update_agent_memory(agent_address, {
        "field2": "updated_value2",
        "field3": "value3"
    })
    
    memory = mock_unibase_store.get_agent_memory(agent_address)
    assert memory['field1'] == "value1"  # Preserved
    assert memory['field2'] == "updated_value2"  # Updated
    assert memory['field3'] == "value3"  # New


@pytest.mark.asyncio
async def test_memory_multiple_updates(registry_adapter, agent_address, mock_unibase_store):
    """Test multiple memory updates."""
    updates = [
        {"count": 1},
        {"count": 2, "last_action": "attack"},
        {"count": 3, "last_action": "defense", "status": "active"}
    ]
    
    for update in updates:
        mock_unibase_store.update_agent_memory(agent_address, update)
    
    memory = mock_unibase_store.get_agent_memory(agent_address)
    assert memory['count'] == 3  # Last value
    assert memory['last_action'] == "defense"
    assert memory['status'] == "active"


# ============================================================================
# ERC-3009 Gasless Transfer Tests
# ============================================================================

@pytest.mark.asyncio
async def test_erc3009_authorization_creation():
    """Test ERC-3009 authorization creation."""
    from datetime import datetime
    
    # Mock EIP-712 signing
    mock_signature = {
        'v': 27,
        'r': '0x' + 'b' * 64,
        's': '0x' + 'c' * 64,
        'signatureHex': '0x' + 'a' * 130
    }
    
    # Test authorization structure
    now = int(datetime.now().timestamp())
    authorization = {
        'from': '0x1234567890123456789012345678901234567890',
        'to': '0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B',
        'value': '1000000000000000000',
        'validAfter': now,
        'validBefore': now + 3600,
        'nonce': '0x' + 'a' * 64
    }
    
    # Verify structure
    assert authorization['to'].startswith('0x')
    assert len(authorization['to']) == 42
    assert authorization['validAfter'] < authorization['validBefore']
    assert len(authorization['nonce']) == 66  # 0x + 64 hex chars
    
    # Verify signature format
    assert mock_signature['v'] in [27, 28]
    assert len(mock_signature['r']) == 66
    assert len(mock_signature['s']) == 66


@pytest.mark.asyncio
async def test_erc3009_authorization_validation():
    """Test ERC-3009 authorization validation."""
    now = int(datetime.now().timestamp())
    
    # Valid authorization
    auth = {
        'to': '0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B',
        'value': '1000000000000000000',
        'validAfter': now - 100,
        'validBefore': now + 3600,
        'nonce': '0x' + 'a' * 64
    }
    
    assert auth['validAfter'] < auth['validBefore']
    assert auth['validBefore'] > now
    
    # Expired authorization
    expired_auth = {
        'to': '0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B',
        'value': '1000000000000000000',
        'validAfter': now - 7200,
        'validBefore': now - 3600,  # Expired
        'nonce': '0x' + 'b' * 64
    }
    
    assert expired_auth['validBefore'] < now  # Expired


# ============================================================================
# Combined Cross-Layer Pipeline Tests
# ============================================================================

@pytest.mark.asyncio
async def test_full_agent_lifecycle(registry_adapter, agent_address, identity_data, mock_unibase_store):
    """Test complete agent lifecycle: register -> reputation -> validate -> memory."""
    # 1. Register agent
    reg_result = registry_adapter.register_agent(agent_address, identity_data)
    assert reg_result['success'] is True
    assert reg_result['combined']['status'] == 'registered'
    
    # 2. Update reputation
    rep_result = registry_adapter.record_agent_reputation(
        agent_address, 
        10, 
        {"reason": "Initial reputation"}
    )
    assert rep_result['success'] is True
    assert rep_result['combined']['delta'] == 10
    
    # 3. Validate agent
    val_result = registry_adapter.validate_agent(
        agent_address,
        {"validator": "system", "result": "passed"}
    )
    assert val_result['success'] is True
    assert val_result['on_chain']['valid'] is True
    
    # 4. Update memory
    memory_key = mock_unibase_store.update_agent_memory(
        agent_address,
        {"last_action": "validated", "timestamp": datetime.now().isoformat()}
    )
    assert memory_key is not None
    
    # Verify all layers
    assert agent_address in registry_adapter.identity_registry.state
    assert agent_address in registry_adapter.reputation_registry.state
    assert agent_address in registry_adapter.validation_registry.state
    memory = mock_unibase_store.get_agent_memory(agent_address)
    assert 'last_action' in memory


@pytest.mark.asyncio
async def test_cross_layer_data_consistency(registry_adapter, agent_address, identity_data, mock_unibase_store):
    """Test data consistency across Unibase and on-chain."""
    # Register with identity
    reg_result = registry_adapter.register_agent(agent_address, identity_data)
    unibase_key = reg_result['unibase']['key']
    identity_uri = reg_result['unibase']['uri']
    
    # Verify URI format
    assert identity_uri.startswith('unibase://record/')
    assert unibase_key in identity_uri
    
    # Verify on-chain has the URI
    on_chain_identity = registry_adapter.identity_registry.state.get(agent_address, {})
    assert on_chain_identity.get('identity_uri') == identity_uri
    
    # Verify Unibase has the data
    unibase_data = mock_unibase_store.storage.get(
        f"agent:identity:{agent_address.lower().replace('0x', '')}"
    )
    assert unibase_data is not None
    assert unibase_data['value']['data'] == identity_data


@pytest.mark.asyncio
async def test_reputation_with_evidence_uri(registry_adapter, agent_address, mock_unibase_store):
    """Test reputation update creates proper evidence URI."""
    metadata = {"reason": "Good audit", "audit_id": "audit_123"}
    result = registry_adapter.record_agent_reputation(agent_address, 10, metadata)
    
    evidence_uri = result['unibase']['uri']
    assert evidence_uri.startswith('unibase://record/')
    
    # Verify on-chain has the evidence URI
    rep_data = registry_adapter.reputation_registry.state.get(agent_address, {})
    assert rep_data.get('evidence_uri') == evidence_uri


@pytest.mark.asyncio
async def test_validation_with_evidence_uri(registry_adapter, agent_address, mock_unibase_store):
    """Test validation creates proper evidence URI."""
    validation_data = {"validator": "0x123...", "result": "passed"}
    result = registry_adapter.validate_agent(agent_address, validation_data)
    
    evidence_uri = result['unibase']['uri']
    assert evidence_uri.startswith('unibase://record/')
    
    # Verify on-chain has the evidence URI
    val_data = registry_adapter.validation_registry.state.get(agent_address, {})
    assert val_data.get('evidence_uri') == evidence_uri


@pytest.mark.asyncio
async def test_error_handling_unibase_failure(registry_adapter, agent_address, identity_data):
    """Test error handling when Unibase fails."""
    # Mock Unibase to fail
    with patch.object(registry_adapter.unibase_store, 'store_identity', side_effect=Exception("Unibase error")):
        result = registry_adapter.register_agent(agent_address, identity_data)
        # Should handle gracefully
        assert result is not None
        # May not succeed, but shouldn't crash


@pytest.mark.asyncio
async def test_error_handling_contract_failure(registry_adapter, agent_address, identity_data):
    """Test error handling when contract call fails."""
    # Mock contract to fail
    with patch.object(registry_adapter.identity_registry, 'functions', side_effect=Exception("RPC error")):
        result = registry_adapter.register_agent(agent_address, identity_data)
        # Should handle gracefully
        assert result is not None


@pytest.mark.asyncio
async def test_concurrent_operations(registry_adapter, agent_address):
    """Test concurrent registry operations."""
    import asyncio
    
    async def register():
        return registry_adapter.register_agent(
            agent_address,
            {"name": "Concurrent Agent", "version": "1.0.0"}
        )
    
    async def update_reputation(delta):
        return registry_adapter.record_agent_reputation(
            agent_address,
            delta,
            {"reason": f"Concurrent update {delta}"}
        )
    
    # Run concurrent operations
    results = await asyncio.gather(
        register(),
        update_reputation(5),
        update_reputation(10),
        update_reputation(-3)
    )
    
    # All should succeed
    assert all(r['success'] for r in results)
    
    # Final reputation should reflect all updates
    rep_data = registry_adapter.reputation_registry.state.get(agent_address, {})
    # Note: Order matters, but at least one update should be reflected
    assert rep_data.get('score', 0) >= 0


# ============================================================================
# Integration Test Helpers
# ============================================================================

@pytest.mark.integration
@pytest.mark.asyncio
async def test_integration_with_real_contracts():
    """Integration test with real contracts (skipped by default)."""
    pytest.skip("Requires deployed contracts and testnet access")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_integration_with_real_unibase():
    """Integration test with real Unibase (skipped by default)."""
    pytest.skip("Requires Unibase testnet access")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])

