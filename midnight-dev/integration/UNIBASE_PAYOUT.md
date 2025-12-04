# Unibase Payout Integration Guide

## Overview

The `UnibasePayout` class provides gasless bounty payout capabilities using Unibase account abstraction and Membase storage.

## Features

- ✅ **Gasless Transactions**: Submit payouts without gas fees
- ✅ **Proof Verification**: Integrates with JudgeAgent for proof validation
- ✅ **Bounty Calculation**: Automatic calculation based on risk scores
- ✅ **Double-Spending Prevention**: Validates payouts to prevent duplicates
- ✅ **Rate Limiting**: Prevents abuse with configurable limits
- ✅ **Membase Storage**: Persistent storage of audit and payout records
- ✅ **Retry Logic**: Automatic retries with exponential backoff
- ✅ **Transaction Signing**: Secure transaction signing
- ✅ **Balance Verification**: Checks wallet balance before payout

## Installation

```bash
cd midnight-dev
npm install
```

## Usage

### Basic Setup

```typescript
import UnibasePayout from "./integration/unibase-payout.js";

const payout = new UnibasePayout({
  unibaseApiUrl: "https://api.unibase.io",
  membaseAccount: "your_membase_account",
  payoutWallet: "0x1234567890abcdef", // Treasury wallet
  judgeAgentUrl: "http://localhost:8002", // Optional
  rateLimitPerHour: 10, // Optional, default: 10
  retryAttempts: 3, // Optional, default: 3
  retryDelay: 1000, // Optional, default: 1000ms
});
```

### Trigger Bounty Payout

```typescript
const verificationResult = {
  proofId: "proof_1234567890abcdef",
  auditorId: "agent1...",
  riskScore: 95,
  bountyAmount: 0, // Will be calculated
  metadata: {
    exploitType: "SQL Injection",
    target: "login_endpoint",
  },
};

const result = await payout.triggerBountyPayout(verificationResult);

if (result.success) {
  console.log(`✅ Payout successful!`);
  console.log(`   Transaction: ${result.txHash}`);
  console.log(`   Amount: ${result.bountyAmount} tokens`);
  console.log(`   Recipient: ${result.recipient}`);
} else {
  console.error(`❌ Payout failed: ${result.error}`);
}
```

### Store Audit in Memory

```typescript
const auditData = {
  proofId: "proof_123",
  exploitHash: "0xabcdef123456...", // Hashed exploit, not actual string
  riskScore: 95,
  timestamp: new Date(),
  auditorId: "agent1...",
  metadata: {
    severity: "HIGH",
  },
};

const confirmation = await payout.storeAuditInMemory(auditData);

if (confirmation.success) {
  console.log(`✅ Audit stored. Storage ID: ${confirmation.storageId}`);
}
```

### Get Payout History

```typescript
const history = await payout.getPayoutHistory("auditor_456");

console.log(`Total Payouts: ${history.totalPayouts}`);
console.log(`Total Earnings: ${history.totalEarnings} tokens`);

history.payouts.forEach((payout) => {
  console.log(`  - ${payout.txHash}: ${payout.bountyAmount} tokens`);
});
```

### Validate Payout

```typescript
const validation = await payout.validatePayout("proof_123");

if (validation.alreadyPaid) {
  console.log(`⚠️  Bounty already paid`);
  console.log(`   Transaction: ${validation.payoutRecord?.txHash}`);
} else {
  console.log(`✅ Proof is eligible for payout`);
}
```

## Bounty Calculation

Bounties are calculated based on risk scores:

- **Risk Score 90-95**: 100 tokens
- **Risk Score 96-99**: 250 tokens
- **Risk Score 100**: 500 tokens
- **Risk Score < 90**: 0 tokens (no payout)

## Security Features

### Transaction Signing

All transactions are signed before submission:

```typescript
// Transaction is automatically signed
const signedTx = await payout.signTransaction(transaction);
```

### Balance Verification

Wallet balance is checked before payout:

```typescript
const hasBalance = await payout.verifyWalletBalance(requiredAmount);
if (!hasBalance) {
  throw new Error("Insufficient balance");
}
```

### Rate Limiting

Rate limits prevent abuse:

- Default: 10 payouts per hour per auditor
- Configurable via `rateLimitPerHour`
- Tracks timestamps per auditor

### Double-Spending Prevention

Validates payouts to prevent duplicates:

```typescript
// Automatically checked in triggerBountyPayout
const validation = await payout.validatePayout(proofId);
if (validation.alreadyPaid) {
  // Payout rejected
}
```

## Error Handling

All methods include comprehensive error handling:

```typescript
try {
  const result = await payout.triggerBountyPayout(verificationResult);
  if (!result.success) {
    // Handle error
    console.error(result.error);
  }
} catch (error) {
  // Handle exception
  console.error("Unexpected error:", error);
}
```

### Retry Logic

Automatic retries with exponential backoff:

- Default: 3 attempts
- Configurable via `retryAttempts`
- Delay increases with each attempt

## Membase Integration

### Storage Format

Audits are stored with:
- `proofId`: Unique proof identifier
- `exploitHash`: Hashed exploit (not actual string)
- `riskScore`: Risk score
- `timestamp`: When audit was created
- `auditorId`: Auditor identifier
- `metadata`: Additional data

### Tags

Records are tagged for easy querying:
- `auditor:{auditorId}`: Filter by auditor
- `risk:{riskScore}`: Filter by risk score
- `tx:{txHash}`: Filter by transaction

## Transaction Logging

All transactions are logged for audit trail:

```typescript
// Automatically logged
{
  type: "payout",
  proofId: "...",
  txHash: "...",
  timestamp: "...",
}
```

## Configuration

### Environment Variables

```bash
# Unibase API
UNIBASE_API_URL=https://api.unibase.io

# Membase
MEMBASE_ACCOUNT=your_account
MEMBASE_SECRET_KEY=your_secret_key

# Payout Wallet
PAYOUT_WALLET=0x1234567890abcdef

# Judge Agent
JUDGE_AGENT_URL=http://localhost:8002

# Rate Limiting
RATE_LIMIT_PER_HOUR=10
```

## Testing

Run unit tests:

```bash
npm run test integration/unibase-payout.test.ts
```

Test coverage includes:
- ✅ Bounty calculation
- ✅ Proof verification
- ✅ Double-spending prevention
- ✅ Rate limiting
- ✅ Error handling
- ✅ Retry logic
- ✅ Balance verification

## API Reference

### `triggerBountyPayout(verificationResult)`

Triggers gasless bounty payout.

**Input:**
```typescript
{
  proofId: string;
  auditorId: string;
  riskScore: number;
  bountyAmount: number; // Will be calculated
  metadata: object;
}
```

**Output:**
```typescript
{
  success: boolean;
  txHash: string;
  bountyAmount: number;
  recipient: string;
  timestamp: Date;
  error?: string;
}
```

### `storeAuditInMemory(auditData)`

Stores verified audit in Membase.

**Input:**
```typescript
{
  proofId: string;
  exploitHash: string; // Hashed, not actual exploit
  riskScore: number;
  timestamp: Date;
  auditorId: string;
  metadata?: object;
}
```

**Output:**
```typescript
{
  success: boolean;
  storageId?: string;
  timestamp: Date;
  error?: string;
}
```

### `getPayoutHistory(auditorId)`

Gets payout history for an auditor.

**Input:** `auditorId: string`

**Output:**
```typescript
{
  payouts: PayoutRecord[];
  totalEarnings: number;
  totalPayouts: number;
}
```

### `validatePayout(proofId)`

Validates if payout already exists.

**Input:** `proofId: string`

**Output:**
```typescript
{
  alreadyPaid: boolean;
  payoutRecord?: PayoutRecord;
  canProceed: boolean;
}
```

## Troubleshooting

### "Proof verification failed"
- Check JudgeAgent is running
- Verify proof ID is correct
- Check network connectivity

### "Bounty already paid"
- Proof has already been paid
- Check payout history
- Verify proof ID

### "Rate limit exceeded"
- Too many payouts in short time
- Wait before retrying
- Adjust `rateLimitPerHour` if needed

### "Insufficient wallet balance"
- Treasury wallet needs more tokens
- Check wallet balance
- Fund wallet if needed

### "Transaction submission failed"
- Check Unibase API connectivity
- Verify Membase account is valid
- Check transaction signing

## Production Considerations

1. **Security**:
   - Use secure wallet signing
   - Store secrets securely
   - Enable rate limiting

2. **Monitoring**:
   - Log all transactions
   - Monitor wallet balance
   - Track payout rates

3. **Scalability**:
   - Use connection pooling
   - Cache frequently accessed data
   - Optimize Membase queries

4. **Reliability**:
   - Implement circuit breakers
   - Use retry logic
   - Handle network failures gracefully

## Support

For issues or questions:
- Check [README.md](../README.md)
- Review test files for examples
- See Unibase documentation

