# ZK Proof Flow Integration Test Guide

## Overview

Comprehensive integration tests for the complete Midnight ZK proof end-to-end flow, from audit submission to bounty payout.

## Test Suite Structure

### Setup Phase
1. **Start Devnet**: Automatically starts Midnight devnet (if Docker available)
2. **Deploy Contract**: Deploys fresh AuditVerifier contract
3. **Initialize Unibase**: Sets up Unibase payout and Membase connections
4. **Seed Test Data**: Adds test vulnerabilities to dictionary

### Test Scenarios

#### 1. Submit High-Severity Audit and Verify Proof
- **Input**: Audit with risk_score = 95
- **Process**:
  - Submit via JudgeAgent
  - Wait for proof generation
  - Verify proof validity
- **Assertions**:
  - Proof hash generated
  - is_verified = true
  - No private data leaked (exploit_string not in public state)

#### 2. Submit Low-Severity Audit and Reject
- **Input**: Audit with risk_score = 75
- **Process**:
  - Submit via JudgeAgent
  - Verify proof generation
- **Assertions**:
  - Proof generated (or rejected before generation)
  - is_verified = false
  - Audit correctly rejected

#### 3. Trigger Gasless Bounty Payout
- **Input**: High-severity audit (risk_score = 97)
- **Process**:
  - Submit audit
  - Verify proof
  - Trigger Unibase payout
  - Check Membase storage
- **Assertions**:
  - Bounty calculated correctly (250 tokens for risk 97)
  - Transaction hash generated
  - Payout record stored in Membase

#### 4. Prevent Duplicate Submissions
- **Input**: Same exploit submitted twice
- **Process**:
  - First submission succeeds
  - Second submission attempted
- **Assertions**:
  - Duplicate detected
  - Second submission rejected
  - Error message indicates duplicate

#### 5. Search Attack Dictionary
- **Input**: Multiple vulnerabilities in dictionary
- **Process**:
  - Search by risk score
  - Search by vulnerability type
  - Search by language
- **Assertions**:
  - Results match filters
  - No exploit strings in results
  - Only exploit hashes returned

#### 6. Handle Network Failures Gracefully
- **Input**: Network timeout simulation
- **Process**:
  - Mock fetch to fail first attempt
  - Verify retry logic
- **Assertions**:
  - Retry attempts made
  - Graceful error handling
  - System continues operation

#### 7. Calculate Correct Bounty Amounts
- **Input**: Various risk scores (90, 95, 96, 99, 100)
- **Process**:
  - Trigger payout for each risk score
- **Assertions**:
  - Risk 90-95 → 100 tokens
  - Risk 96-99 → 250 tokens
  - Risk 100 → 500 tokens

#### 8. Enforce Rate Limits
- **Input**: Multiple payouts from same auditor
- **Process**:
  - Attempt more than rate limit
- **Assertions**:
  - Rate limit enforced
  - Excess attempts rejected
  - Error message indicates rate limit

### Teardown Phase
1. **Clear Test Data**: Removes test proofs and records
2. **Reset Contract State**: Resets contract to initial state
3. **Stop Devnet**: Optionally stops devnet (kept running for speed)

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Start devnet (optional - tests will use mocks if unavailable)
npm run devnet:start
```

### Run All Integration Tests

```bash
npm run integration:test
```

### Run Specific Test

```bash
npm run test test/integration/zk-flow.test.ts -t "submit high-severity"
```

### Run with Watch Mode

```bash
npm run integration:test:watch
```

### Run with Verbose Output

```bash
DEBUG=true npm run integration:test
```

## Test Configuration

Tests use environment-aware configuration:

```typescript
{
  devnetUrl: "http://127.0.0.1:6300",
  unibaseApiUrl: "http://localhost:3000",
  membaseAccount: "test_account",
  payoutWallet: "0x1234567890abcdef",
  judgeAgentUrl: "http://localhost:8002",
}
```

## Mock Mode

If services are unavailable, tests automatically:
- Use mock proof hashes
- Simulate verification
- Continue with integration flow
- Log warnings for missing services

This allows tests to run even without full infrastructure.

## Test Output

Tests provide detailed logging:

```
📋 Test 1: Submit high-severity audit and verify proof

   Step 1: Submitting audit via JudgeAgent...
   - Audit ID: test_high_severity_1234567890
   - Risk Score: 95
   - Threshold: 90
   ✅ Proof submitted: abc123def456...
   
   Step 2: Waiting for proof generation...
   ✅ Proof verified: true
   
   Step 3: Checking privacy...
   ✅ Privacy check passed
```

## Debugging

### Enable Detailed Logging

```bash
DEBUG=true npm run integration:test
```

### Check Devnet Status

```bash
npm run devnet:verify
```

### View Test Logs

Tests log to console with emoji indicators:
- ✅ Success
- ⚠️  Warning
- ❌ Error
- 📋 Test step
- 🔍 Verification
- 💰 Payout
- 💾 Storage

## Common Issues

### Devnet Not Running

**Symptom**: Tests use mocks instead of real devnet

**Solution**:
```bash
npm run devnet:start
npm run devnet:verify
```

### Contract Not Deployed

**Symptom**: Contract address is empty

**Solution**:
```bash
npm run deploy
```

### Network Timeouts

**Symptom**: Tests fail with timeout errors

**Solution**:
- Check network connectivity
- Verify services are running
- Increase test timeout if needed

### Rate Limit Errors

**Symptom**: Tests fail due to rate limiting

**Solution**:
- Wait between test runs
- Adjust rate limit in test config
- Use different auditor IDs

## Test Coverage

The integration tests cover:

- ✅ Proof submission flow
- ✅ Proof verification
- ✅ Bounty calculation
- ✅ Payout processing
- ✅ Duplicate prevention
- ✅ Dictionary operations
- ✅ Error handling
- ✅ Retry logic
- ✅ Rate limiting
- ✅ Privacy guarantees

## Best Practices

1. **Run tests in order**: Tests may depend on previous state
2. **Clean up after tests**: Teardown ensures clean state
3. **Use unique IDs**: Prevents conflicts between test runs
4. **Check logs**: Detailed logging helps debug issues
5. **Mock when needed**: Tests work with or without services

## Continuous Integration

For CI/CD pipelines:

```bash
# Start devnet
npm run devnet:start

# Wait for readiness
sleep 10

# Run tests
npm run integration:test

# Cleanup (optional)
npm run devnet:stop
```

## Performance

- **Individual tests**: 30-60 seconds
- **Full suite**: ~5 minutes
- **With devnet**: +2 minutes for setup

## Next Steps

After running tests:

1. Review test output for any warnings
2. Check coverage report
3. Verify all assertions pass
4. Review logs for integration issues

