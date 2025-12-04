# AuditVerifier Contract Documentation

## Overview

The `AuditVerifier` contract is a zero-knowledge smart contract for Midnight Network that enables security auditors to submit and verify audit results without revealing sensitive vulnerability details.

## Key Features

### Privacy-Preserving Verification

- **Private Data**: Exploit strings, risk scores, and submission timestamps remain completely private
- **Public Verification**: Verification status and auditor IDs are stored publicly
- **ZK Proofs**: Cryptographic proofs verify properties without revealing values

### Security Guarantees

1. **Risk Score Verification**: Proves `risk_score > 90` without revealing the actual score
2. **Exploit Validation**: Proves `exploit_string.length > 0` without revealing content
3. **Immutable Records**: Once verified, audit status cannot be changed

## Contract Structure

### Private Witness Data

These values are **never revealed on-chain** and only exist in the prover's private state:

- `exploit_string`: Bytes<64> - The actual vulnerability/exploit code
- `risk_score`: Uint<8> - Security risk score (0-100)
- `submission_timestamp`: Uint<64> - When audit was originally submitted

### Public Ledger State

These values are **visible to everyone** on the blockchain:

- `is_verified`: Map<Bytes<32>, Bool> - Verification status per audit
- `auditor_id`: Map<Bytes<32>, Bytes<32> - Anonymous auditor identifier
- `proof_timestamp`: Map<Bytes<32>, Uint<64> - When proof was generated

## Circuits (Public Functions)

### `submitAudit(audit_id, auditor_id, threshold)`

**Purpose**: Submit an audit with private data and generate ZK proof

**Parameters**:
- `audit_id`: Bytes<32> - Unique audit identifier
- `auditor_id`: Bytes<32> - Anonymous auditor identifier
- `threshold`: Uint<8> - Minimum risk score (default: 90)

**ZK Proof Logic**:
1. Retrieves private witness data (exploit_string, risk_score, submission_timestamp)
2. Proves `risk_score > threshold` without revealing actual score
3. Proves `exploit_string` is non-empty without revealing content
4. Stores verification status and metadata publicly

**Privacy**: 
- ✅ Does NOT reveal risk_score value
- ✅ Does NOT reveal exploit_string content
- ✅ Does NOT reveal submission_timestamp

### `verifyProof(audit_id) -> Bool`

**Purpose**: Check if an audit has passed verification

**Parameters**:
- `audit_id`: Bytes<32> - Audit identifier to check

**Returns**: 
- `Bool` - `true` if verified, `false` otherwise

**Privacy**: Read-only, no private data required

### `getAuditorId(audit_id) -> Bytes<32>`

**Purpose**: Get the auditor identifier for an audit

**Parameters**:
- `audit_id`: Bytes<32> - Audit identifier

**Returns**:
- `Bytes<32>` - Auditor identifier, or zero bytes if not found

**Privacy**: Returns only public auditor_id, no private data revealed

### `getProofTimestamp(audit_id) -> Uint<64>`

**Purpose**: Get when the proof was generated

**Parameters**:
- `audit_id`: Bytes<32> - Audit identifier

**Returns**:
- `Uint<64>` - Proof timestamp, or 0 if not found

**Privacy**: Returns only public proof_timestamp, not submission_timestamp

## Usage Example

### Submitting an Audit

```typescript
// Private witness data (never revealed)
const exploitString = "SQL injection vulnerability in login endpoint";
const riskScore = 95; // High severity
const submissionTimestamp = Date.now();

// Public parameters
const auditId = hash(exploitString + submissionTimestamp);
const auditorId = hash(auditorPublicKey);
const threshold = 90;

// Submit audit (generates ZK proof)
await submitAudit(auditId, auditorId, threshold);
// Proof verifies: riskScore > 90 && exploitString.length > 0
// Without revealing actual values!
```

### Verifying an Audit

```typescript
// Anyone can verify (no private data needed)
const isVerified = await verifyProof(auditId);
console.log(`Audit verified: ${isVerified}`); // true/false

// Get auditor ID (public)
const auditorId = await getAuditorId(auditId);
console.log(`Auditor: ${auditorId}`);

// Get proof timestamp (public)
const timestamp = await getProofTimestamp(auditId);
console.log(`Proof generated at: ${new Date(timestamp * 1000)}`);
```

## Zero-Knowledge Proof Details

### What is Proven

1. **Risk Score > Threshold**: 
   - Proves: `risk_score > 90`
   - Does NOT reveal: Actual risk_score value
   - Verification: Anyone can verify the proof is valid

2. **Exploit String Non-Empty**:
   - Proves: `exploit_string.length > 0`
   - Does NOT reveal: Exploit string content
   - Verification: Anyone can verify the proof is valid

### Privacy Guarantees

- **Zero-Knowledge**: Verifiers learn nothing about private data except what's proven
- **Soundness**: Invalid proofs cannot be generated (cryptographically secure)
- **Completeness**: Valid proofs are always accepted

## Security Considerations

### High Severity Threshold

The contract enforces `risk_score > 90` as the verification threshold. This ensures:
- Only high-severity vulnerabilities trigger verification
- Medium/low severity audits don't clutter the ledger
- Critical issues are prioritized

### Exploit String Validation

The contract requires non-empty exploit strings to prevent:
- Empty/null submissions
- Invalid audit data
- Spam submissions

### Immutability

Once an audit is verified and stored on-chain:
- Verification status cannot be changed
- Audit records are permanent
- Historical audit trail is maintained

## Integration with Judge Agent

The Judge agent can use this contract to:

1. **Submit Vulnerabilities**: When a vulnerability is detected, submit audit with:
   - Private: exploit_string, risk_score, submission_timestamp
   - Public: audit_id, auditor_id (judge address)

2. **Verify Status**: Check if audit passed verification

3. **Track Audits**: Query auditor_id and proof_timestamp for audit history

## Compilation

```bash
# Compile Compact contract
compact compile AuditVerifier.compact ./build

# Build TypeScript bindings
npm run build
```

## Testing

```bash
# Run contract tests
npm run test

# Test ZK proof generation
npm run test:zk
```

## Resources

- [Compact Language Documentation](https://docs.midnight.network/compact)
- [Midnight Network Docs](https://docs.midnight.network/)
- [ZK Proofs Guide](https://docs.midnight.network/zk-proofs)

