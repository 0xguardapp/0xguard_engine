# Integration Tests

Comprehensive integration tests for the Midnight ZK proof end-to-end flow.

## Test Suite: "Midnight ZK Proof End-to-End Flow"

### Test Scenarios

1. **Submit high-severity audit and verify proof**
   - Creates mock audit data (risk_score = 95)
   - Submits via JudgeAgent
   - Waits for proof generation
   - Verifies proof is valid
   - Checks is_verified = true
   - Asserts no private data leaked

2. **Submit low-severity audit and reject**
   - Creates mock audit (risk_score = 75)
   - Submits via JudgeAgent
   - Verifies proof is generated
   - Checks is_verified = false
   - Asserts audit rejected

3. **Trigger gasless bounty payout**
   - Submits high-severity audit
   - Verifies proof
   - Triggers Unibase payout
   - Checks bounty received
   - Verifies storage in Membase

4. **Prevent duplicate submissions**
   - Submits same exploit twice
   - Checks duplicate detection works
   - Asserts second submission rejected

5. **Search attack dictionary**
   - Adds multiple vulnerabilities
   - Searches by risk score
   - Searches by type
   - Asserts results correct

6. **Handle network failures gracefully**
   - Mocks network timeout
   - Checks retry logic works
   - Verifies graceful degradation

7. **Calculate correct bounty amounts**
   - Tests all bounty tiers
   - Verifies calculation logic

8. **Enforce rate limits**
   - Tests rate limiting per auditor
   - Verifies limit enforcement

## Setup

The test suite automatically:

- Starts local Midnight devnet (if available)
- Deploys fresh contract
- Initializes Unibase connection
- Seeds test data

## Teardown

The test suite automatically:

- Stops devnet (optional)
- Clears test data
- Resets contract state

## Running Tests

```bash
# Run all integration tests
npm run test test/integration/zk-flow.test.ts

# Run with watch mode
npm run test:watch test/integration/zk-flow.test.ts

# Run specific test
npm run test test/integration/zk-flow.test.ts -t "submit high-severity"
```

## Prerequisites

1. **Docker** (for devnet)
2. **Midnight devnet** (optional - tests will use mocks if unavailable)
3. **Node.js** >= 18.0.0

## Test Configuration

Tests use the following configuration:

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

If devnet is not available, tests will:
- Use mock proof hashes
- Simulate verification
- Continue with integration flow
- Log warnings for missing services

## Test Timeouts

- Individual tests: 30-60 seconds
- Full suite: ~5 minutes

## Debugging

Enable verbose logging:

```bash
DEBUG=true npm run test test/integration/zk-flow.test.ts
```

## Coverage

Tests cover:
- ✅ Proof submission
- ✅ Proof verification
- ✅ Bounty calculation
- ✅ Payout processing
- ✅ Duplicate prevention
- ✅ Dictionary search
- ✅ Error handling
- ✅ Rate limiting

