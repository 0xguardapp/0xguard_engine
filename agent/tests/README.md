# Judge Agent Test Suite

Comprehensive test suite for the Judge Agent system covering all major functionality.

## Test Structure

```
tests/
├── __init__.py
├── test_judge_agent.py    # Main test suite
└── README.md              # This file
```

## Running Tests

### Run All Tests

```bash
# Activate virtual environment first
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

# Run all tests
pytest tests/

# Run with verbose output
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=judge_agent --cov-report=html
```

### Run Specific Test Categories

```bash
# Run only unit tests (exclude integration)
pytest tests/ -m "not integration"

# Run only integration tests
pytest tests/ -m integration

# Run performance benchmarks
pytest tests/ -m benchmark

# Run a specific test
pytest tests/test_judge_agent.py::test_successful_bounty_payout -v
```

### Run with Performance Output

```bash
# Run benchmarks with timing
pytest tests/ -m benchmark --benchmark-only
```

## Test Coverage

### Unit Tests

1. **test_successful_bounty_payout**
   - Tests complete bounty payout flow
   - Verifies transaction creation
   - Checks Membase logging

2. **test_invalid_exploit_rejection**
   - Tests rejection of invalid exploits
   - Verifies no payout for wrong SECRET_KEY

3. **test_replay_attack_prevention**
   - Tests duplicate exploit detection
   - Verifies replay attack prevention

4. **test_severity_based_bounty_calculation**
   - Tests all severity levels
   - Verifies correct bounty amounts

5. **test_gasless_transaction**
   - Tests gasless transaction flow
   - Verifies Unibase integration

6. **test_rate_limiting**
   - Tests rate limit enforcement
   - Verifies max bounties per hour

7. **test_cooldown_enforcement**
   - Tests cooldown period
   - Verifies time-based restrictions

8. **test_membase_audit_trail**
   - Tests audit logging
   - Verifies data integrity

9. **test_concurrent_attacks**
   - Tests concurrent processing
   - Verifies thread safety

10. **test_error_recovery**
    - Tests retry logic
    - Verifies graceful error handling

### Performance Benchmarks

- **test_bounty_payout_performance**: Target <2s per bounty
- **test_concurrent_bounty_performance**: Concurrent processing benchmark

### Integration Tests

- **test_integration_unibase_connection**: Testnet connection test
- **test_integration_membase_connection**: Membase connection test

## Mock Objects

The test suite includes mock implementations:

- **MockUnibaseClient**: Simulates Unibase transactions
- **MockMembaseClient**: Simulates Membase storage
- **MockTarget**: Simulates vulnerable target system

## Test Fixtures

Common fixtures available:

- `test_config`: Test configuration
- `judge_agent`: JudgeAgent instance
- `mock_attack_data`: Sample attack data
- `mock_target`: Mock target system
- `mock_unibase`: Mock Unibase client
- `mock_membase`: Mock Membase client

## Writing New Tests

```python
import pytest
from judge_agent import JudgeAgent

@pytest.mark.asyncio
async def test_my_feature(judge_agent, mock_attack_data):
    """Test description."""
    # Your test code here
    result = await judge_agent.some_method()
    assert result.success is True
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    pip install -r requirements.txt
    pytest tests/ -v --cov
```

## Troubleshooting

### Import Errors

If you get import errors, ensure you're in the agent directory:

```bash
cd agent
pytest tests/
```

### Async Test Issues

Ensure pytest-asyncio is installed:

```bash
pip install pytest-asyncio
```

### Mock Issues

If mocks aren't working, check that pytest-mock is installed:

```bash
pip install pytest-mock
```

## Test Results

View coverage report:

```bash
pytest tests/ --cov=judge_agent --cov-report=html
open htmlcov/index.html  # Linux/macOS
start htmlcov/index.html  # Windows
```

