# Midnight Contracts

This directory contains Compact smart contracts for the Midnight Network.

## Contract Structure

### AuditVerifier.compact

**Location**: `./AuditVerifier.compact` (this directory)

A comprehensive zero-knowledge audit verification contract that:

- **Private State**: Stores exploit strings, risk scores, and submission timestamps privately
- **Public State**: Stores verification status, auditor IDs, and proof timestamps publicly
- **ZK Proofs**: Proves `risk_score > 90` and `exploit_string.length > 0` without revealing values
- **Functions**: `submitAudit()`, `verifyProof()`, `getAuditorId()`, `getProofTimestamp()`

See [AuditVerifier.md](./AuditVerifier.md) for complete documentation.

### Legacy Contract

The original contract is located in `../contracts/midnight/src/AuditVerifier.compact`.

## Compiling Contracts

To compile Compact contracts:

```bash
# From the midnight-dev directory
npm run compile

# Or directly from contracts/midnight
cd ../contracts/midnight
npm run compact
npm run build
```

## Contract Details

### AuditVerifier.compact

A zero-knowledge audit verification contract that:
- Stores private witness data (exploit_string, risk_score)
- Proves risk_score >= threshold without revealing values
- Stores public proof hashes on-chain
- Tracks verification status and auditor IDs

### Circuit: submitAudit

```compact
export circuit submitAudit(
  audit_id: Bytes<32>,
  auditor_id: Bytes<32>,
  threshold: Uint<64>
): []
```

**Private Witness:**
- `exploit_string`: Bytes<64> - The exploit payload (never revealed)
- `risk_score`: Uint<64> - Risk score (never revealed)

**Public State:**
- `proofs`: Map<Bytes<32>, Bytes<32>> - audit_id -> proof_hash
- `is_verified`: Map<Bytes<32>, Bool> - audit_id -> verification status
- `auditor_id`: Map<Bytes<32>, Bytes<32>> - audit_id -> auditor identifier

## Adding New Contracts

1. Create a new `.compact` file in `../contracts/midnight/src/`
2. Define your contract with Compact syntax
3. Compile with `npm run compile`
4. Deploy with `npm run deploy` from the midnight-dev directory

## Resources

- [Compact Language Documentation](https://docs.midnight.network/compact)
- [Midnight Network Documentation](https://docs.midnight.network/)

