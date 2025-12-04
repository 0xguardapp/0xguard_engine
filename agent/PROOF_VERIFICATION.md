# Proof Verification Guide

## Overview

The Judge Agent has been extended with comprehensive proof verification capabilities for validating ZK proofs from Midnight Network contracts.

## Features

### 1. `verifyAuditProof(proofId, auditorId?)`

Verifies a single audit proof with the following process:

- **a. Fetch proof** from Midnight contract
- **b. Verify ZK proof** is cryptographically valid
- **c. Check risk_score > 90** (without revealing actual score)
- **d. Confirm auditor_id** matches (if provided)
- **e. Return verification result**

**Returns:**
```python
{
    "isValid": bool,
    "isHighSeverity": bool,  # true if risk_score > 90
    "auditorId": string,
    "timestamp": datetime,
    "proofData": object,
    "error": string | null
}
```

### 2. `batchVerify(proofIds[], auditorId?)`

Verifies multiple proofs in parallel for gas efficiency.

- Processes proofs concurrently
- Returns array of verification results
- Optimized for batch operations

**Returns:**
```python
[
    {
        "isValid": bool,
        "isHighSeverity": bool,
        "auditorId": string,
        "timestamp": datetime,
        "proofData": object,
        "error": string | null
    },
    ...
]
```

### 3. `getVerificationProof(proofId, format?)`

Exports proof in portable format for off-chain verification.

- **format**: "json" (default) or "hex"
- Can be verified independently
- Portable proof format

**Returns:**
- JSON string (default) or hex string

## Usage

### Basic Verification

```python
from proof_verifier import verify_audit_proof

# Verify a proof
result = await verify_audit_proof("audit_id_123")

if result.isValid:
    print(f"Proof verified! High severity: {result.isHighSeverity}")
    print(f"Auditor: {result.auditorId}")
else:
    print(f"Verification failed: {result.error}")
```

### Verify with Auditor ID

```python
# Verify and check auditor ID
result = await verify_audit_proof(
    "audit_id_123",
    expected_auditor_id="agent1..."
)

if result.isValid and not result.error:
    print("Proof verified and auditor matches!")
```

### Batch Verification

```python
from proof_verifier import batch_verify

# Verify multiple proofs
proof_ids = ["proof1", "proof2", "proof3"]
results = await batch_verify(proof_ids)

for i, result in enumerate(results):
    print(f"Proof {i+1}: {'Valid' if result.isValid else 'Invalid'}")
```

### Export Proof

```python
from proof_verifier import get_verification_proof

# Export as JSON
proof_json = await get_verification_proof("audit_id_123", "json")
print(proof_json)

# Export as hex
proof_hex = await get_verification_proof("audit_id_123", "hex")
print(proof_hex)
```

### Using with Judge Agent

```python
# Via query handler
query = {
    "method": "verifyAuditProof",
    "proofId": "audit_id_123",
    "auditorId": "agent1..."  # optional
}
result = await judge.on_query(query)

# Direct method access
result = await judge.verify_audit_proof("audit_id_123")
```

## Edge Cases Handled

### Expired Proofs

Proofs expire after 24 hours (configurable via `MIDNIGHT_PROOF_EXPIRY_HOURS`).

```python
result = await verify_audit_proof("expired_proof_id")
if result.error == "Proof has expired":
    print("Proof is too old")
```

### Invalid Proof IDs

```python
result = await verify_audit_proof("")
# Returns ProofVerificationResult with isValid=False
```

### Network Timeouts

```python
# Automatically handles timeouts
result = await verify_audit_proof("proof_id")
if result.error == "Network timeout":
    print("Network issue - retry later")
```

### Contract Upgrade Scenarios

The verification handles contract upgrades gracefully:

```python
# Contract may return additional fields
result = await verify_audit_proof("proof_id")
if "contract_version" in result.proofData:
    print(f"Contract version: {result.proofData['contract_version']}")
```

## Configuration

Environment variables:

```bash
# Midnight Network endpoints
MIDNIGHT_DEVNET_URL=http://localhost:6300
MIDNIGHT_BRIDGE_URL=http://localhost:3000
MIDNIGHT_CONTRACT_ADDRESS=0x...
MIDNIGHT_INDEXER=http://localhost:6300/graphql
MIDNIGHT_INDEXER_WS=ws://localhost:6300/graphql/ws

# Proof expiry (hours)
MIDNIGHT_PROOF_EXPIRY_HOURS=24
```

## Error Handling

All methods return `ProofVerificationResult` with error information:

```python
result = await verify_audit_proof("proof_id")

if not result.isValid:
    print(f"Error: {result.error}")
    # Handle error appropriately
```

Common errors:
- `"Proof not found on contract"`
- `"ZK proof verification failed"`
- `"Network timeout"`
- `"Proof has expired"`
- `"Auditor ID mismatch: ..."`

## Testing

Run unit tests:

```bash
# Install pytest if needed
pip install pytest pytest-asyncio

# Run tests
pytest test_proof_verifier.py -v

# Run specific test
pytest test_proof_verifier.py::test_verify_audit_proof_success -v
```

Test coverage includes:
- ✅ Successful verification
- ✅ Proof not found
- ✅ Invalid ZK proof
- ✅ Auditor ID mismatch
- ✅ Expired proofs
- ✅ Network timeouts
- ✅ Batch verification
- ✅ Export formats
- ✅ Edge cases

## Implementation Details

### Proof Fetching

The module tries multiple sources in order:
1. Bridge service (`MIDNIGHT_BRIDGE_URL`)
2. GraphQL indexer (`MIDNIGHT_INDEXER`)
3. Simulation mode (development)

### ZK Proof Verification

Verification checks:
- `is_verified` is `True` (contract verified)
- `proof_hash` exists and is valid hex
- Proof structure is correct

### Batch Processing

Batch verification:
- Uses `asyncio.gather()` for parallel execution
- 30-second timeout for entire batch
- Individual failures don't stop batch
- Returns results in same order as input

## Security Considerations

1. **Proof Expiry**: Proofs expire after configured hours
2. **Auditor Verification**: Can verify auditor ID matches
3. **ZK Validation**: Cryptographic proof validation
4. **Network Security**: HTTPS/WSS for production endpoints

## Future Enhancements

- [ ] Caching of verification results
- [ ] Proof revocation checking
- [ ] Multi-contract support
- [ ] Proof chain validation
- [ ] Performance metrics

## Troubleshooting

### "Proof not found on contract"
- Verify proof ID is correct
- Check contract address is set
- Ensure proof was actually deployed

### "Network timeout"
- Check network connectivity
- Verify endpoints are accessible
- Increase timeout if needed

### "Proof has expired"
- Check `MIDNIGHT_PROOF_EXPIRY_HOURS` setting
- Re-submit proof if needed

### "ZK proof verification failed"
- Proof may be invalid
- Contract may have rejected it
- Check contract state

## API Reference

See `proof_verifier.py` for complete API documentation.

