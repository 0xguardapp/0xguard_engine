# Agent Registry Test Suite

Comprehensive pytest test suite for the Agent Registry System covering all layers: Unibase, on-chain contracts, and cross-layer integration.

## Test Coverage

### 1. Agent Registration Tests
- `test_agent_registration` - Full registration flow (Unibase + on-chain)
- `test_agent_registration_duplicate` - Handling duplicate registrations
- `test_agent_registration_invalid_address` - Error handling for invalid addresses

### 2. Identity Update Tests
- `test_identity_update` - Updating existing agent identity
- `test_identity_update_not_registered` - Updating unregistered agent

### 3. Reputation Tests
- `test_reputation_increment` - Adding reputation points
- `test_reputation_decrement` - Subtracting reputation points
- `test_reputation_floor_at_zero` - Reputation cannot go negative
- `test_reputation_multiple_updates` - Multiple reputation updates

### 4. Validation Tests
- `test_agent_validation` - Validating an agent
- `test_validation_revocation` - Revoking validation

### 5. Unibase Memory Tests
- `test_memory_initialization` - Initializing agent memory
- `test_memory_merge_update` - Merging memory updates
- `test_memory_multiple_updates` - Multiple memory updates

### 6. ERC-3009 Gasless Transfer Tests
- `test_erc3009_authorization_creation` - Creating authorization structure
- `test_erc3009_authorization_validation` - Validating authorization timestamps

### 7. Combined Cross-Layer Pipeline Tests
- `test_full_agent_lifecycle` - Complete lifecycle: register → reputation → validate → memory
- `test_cross_layer_data_consistency` - Data consistency across Unibase and on-chain
- `test_reputation_with_evidence_uri` - Reputation updates create proper URIs
- `test_validation_with_evidence_uri` - Validation creates proper URIs
- `test_error_handling_unibase_failure` - Error handling when Unibase fails
- `test_error_handling_contract_failure` - Error handling when contracts fail
- `test_concurrent_operations` - Concurrent registry operations

## Running Tests

### Run all tests
```bash
pytest agent/tests/test_agent_registry.py -v
```

### Run specific test category
```bash
# Registration tests only
pytest agent/tests/test_agent_registry.py::test_agent_registration -v

# Reputation tests only
pytest agent/tests/test_agent_registry.py -k "reputation" -v

# Cross-layer tests
pytest agent/tests/test_agent_registry.py -k "cross_layer" -v
```

### Run with coverage
```bash
pytest agent/tests/test_agent_registry.py --cov=agent_registry_adapter --cov=unibase_agent_store --cov-report=html
```

## Mock Objects

The test suite includes comprehensive mocks:

### MockWeb3
- Simulates Web3/viem contract interactions
- Tracks contract state
- Mocks transaction signing and sending

### MockContract
- Simulates Solidity contract instances
- Maintains state for Identity, Reputation, and Validation registries
- Supports both read (call) and write (transact) operations

### MockUnibaseStore
- Simulates UnibaseAgentStore operations
- Tracks storage calls
- Maintains in-memory key-value store

## Test Structure

Each test follows this pattern:
1. Setup: Create mocks and test data
2. Execute: Call the function under test
3. Verify: Check results across all layers (Unibase + on-chain)
4. Assert: Verify state consistency

## Integration Tests

Integration tests are marked with `@pytest.mark.integration` and skipped by default:
- `test_integration_with_real_contracts` - Requires deployed contracts
- `test_integration_with_real_unibase` - Requires Unibase testnet access

Run integration tests:
```bash
pytest agent/tests/test_agent_registry.py -m integration
```

## Key Test Scenarios

### Full Lifecycle Test
Tests the complete flow:
1. Register agent → Unibase + IdentityRegistry
2. Update reputation → Unibase + ReputationRegistry
3. Validate agent → Unibase + ValidationRegistry
4. Update memory → Unibase only

### Cross-Layer Consistency
Verifies that:
- Unibase keys match on-chain URIs
- Evidence URIs are properly formatted
- Data is consistent across both layers

### Error Handling
Tests graceful degradation when:
- Unibase is unavailable
- Contract calls fail
- Invalid inputs are provided

## Dependencies

Required packages (already in requirements.txt):
- pytest>=7.4.0
- pytest-asyncio>=0.21.0
- pytest-mock>=3.11.0

## Notes

- All external dependencies are mocked (no real RPC or Unibase calls)
- Tests run in isolation (each test has fresh mocks)
- Async tests use pytest-asyncio
- Contract state is maintained in memory for testing

