# 🏴‍☠️ 0xGuard: AuditVerifier Smart Contract

**0xGuard** is security verification system where attackers with sufficient risk scores can submit audits that get cryptographically verified and stored on-chain with expiration timestamps, without revealing sensitive exploit data.



## Contract Architecture

### Public Ledger State
```compact
export ledger proofs: Map<Bytes<32>, Bytes<32>>;          // audit_id -> proof_hash
export ledger verified_audits: Map<Bytes<32>, Bytes<32>>; // audit_id -> proof_hash (query convenience)
export ledger accepted_at: Map<Bytes<32>, Uint<64>>;      // audit_id -> expiration_timestamp
```

### Private Witness Data (Never Revealed)
```compact
witness nonce(): Bytes<32>;          // Cryptographic randomness
witness risk_score(): Uint<64>;      // Attacker's security credibility score
witness attacker_wallet(): Bytes<32>; // Attacker's wallet identifier
```

### Core Circuit Logic
The `submitAudit` circuit proves that:
1. `risk_score >= threshold` (without revealing the actual score)
2. Generates cryptographic proof linking audit_id, nonce, and attacker_wallet
3. Stores proof hashes publicly while keeping sensitive data private

---

## Quick Setup

### Prerequisites
- **Midnight Network** development environment
- **Compact** compiler 

### Installation & Build
```bash
# Install dependencies
npm install

# Compile Compact contract and build TypeScript
npm run build

```

**Important**: Always run `npm run compact` before `npm run build` to ensure circuit compilation.

---

## Testing

The test suite (`src/test/AuditVerifier.test.ts`) validates:

### Core Functionality
- ✅ **Deterministic State Generation**: Identical inputs produce identical ledger states
- ✅ **Risk Score Validation**: Rejects audits below minimum thresholds
- ✅ **Multi-Audit Support**: Multiple audits from same/different attackers
- ✅ **Boundary Conditions**: Edge cases like maximum u64 values


### Running Tests

```bash
docker run -d -p 6300:6300 midnightnetwork/proof-server:latest

npm test

```

## Usage in 0xGuard Workflow

### Phase 1: Attack Discovery
1. **Red Team Agent** queries ASI.One for novel attack vectors
2. **Target Agent** simulates vulnerable smart contract
3. **Risk scoring** based on exploit complexity and impact

### Phase 2: Verification & Storage
1. **Judge Agent** validates successful exploits
2. **AuditVerifier Contract** proves risk_score >= threshold via ZK
3. **Unibase** stores attack patterns for future reference


