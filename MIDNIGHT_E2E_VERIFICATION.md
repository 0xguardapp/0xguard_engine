# Midnight Network End-to-End Verification

This document describes how to verify the complete Midnight Network integration is working correctly.

## Prerequisites

1. **Midnight Devnet (Proof Server)** running on port 6300
2. **Midnight API** running on port 8100
3. **Wallet** loaded with testnet tokens (for contract deployment)

## Quick Verification

Run the automated test script:

```bash
./test-midnight-e2e.sh
```

## Manual Verification Steps

### 1. Verify Devnet is Running

```bash
curl http://localhost:6300/health
```

**Expected Response:**
```
We're alive 🎉!
```

### 2. Verify Midnight API is Running

```bash
curl http://localhost:8100/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "initialized": false,
  "contract_address": null
}
```

### 3. Verify Wallet is Loaded

```bash
curl -X POST http://localhost:8100/api/init \
  -H "Content-Type: application/json" \
  -d '{"mode": "deploy", "environment": "testnet"}'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "contract_address": "mn_shield-addr_...",
  "message": "Contract deployed successfully"
}
```

**Note:** If you get "insufficient funds" error, you need to fund your wallet with testnet tokens.

### 4. Verify Proof Submission Events

Check logs for `[proof_submitted]` events:

```bash
grep -i "\[proof_submitted\]" logs.json
```

**Expected Format:**
```json
{
  "timestamp": "2025-12-07T...",
  "agent": "Judge",
  "message": "[proof_submitted] Proof Hash: zk_..., Transaction ID: ..., Status: submitted, ...",
  "category": "proof",
  "auditId": "..."
}
```

### 5. Verify Proof Verification Events

Check logs for `[proof_verified]` events:

```bash
grep -i "\[proof_verified\]" logs.json
```

**Expected Format:**
```json
{
  "timestamp": "2025-12-07T...",
  "agent": "Judge",
  "message": "[proof_verified] Proof Hash: zk_..., Transaction ID: ..., Status: verified, ...",
  "category": "proof",
  "auditId": "..."
}
```

## Log Event Structure

All proof-related logs should include:

1. **Proof Hash**: Unique identifier for the proof
2. **Transaction ID**: Contract transaction ID from Midnight Network
3. **Status**: `submitted`, `verified`, `pending`, or `failed`
4. **Timestamp**: ISO format timestamp
5. **Audit ID**: Associated audit identifier

### Example Log Entries

**Proof Submitted:**
```
[proof_submitted] Proof Hash: zk_abc123..., Transaction ID: tx_xyz789..., Status: submitted, Risk Score: 95, Audit ID: audit_456..., Auditor: judge_789...
```

**Proof Verified:**
```
[proof_verified] Proof Hash: zk_abc123..., Transaction ID: tx_xyz789..., Status: verified, Audit ID: audit_456..., Verified: true
```

## Troubleshooting

### Devnet Not Running

```bash
docker run -d -p 6300:6300 --name midnight-proof-server \
  midnightnetwork/proof-server:4.0.0 -- \
  'midnight-proof-server --network testnet'
```

### Midnight API Not Running

```bash
cd contracts/midnight/api
PORT=8100 python3 python/main.py
```

### Insufficient Funds Error

The wallet needs testnet tokens to deploy contracts. Options:

1. Get testnet tokens from Midnight testnet faucet
2. Use a wallet that already has testnet tokens
3. Use local devnet (requires full devnet setup)

### No Proof Events in Logs

Proof events are generated when:
1. Judge agent detects a vulnerability
2. Judge submits proof to Midnight Network
3. Proof is verified on Midnight Network

To generate events:
1. Start all agents (Target, Judge, Red Team)
2. Red Team performs attacks
3. Judge detects vulnerability and submits proof
4. Check logs for `[proof_submitted]` and `[proof_verified]` events

## Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Devnet | ✅ Running | Port 6300 |
| Midnight API | ✅ Running | Port 8100 |
| Wallet | ⚠️ Needs Tokens | Insufficient funds for deployment |
| Contract | ⚠️ Not Initialized | Requires funded wallet |
| Proof Events | ⚠️ None Yet | Will appear after agent runs |

## Next Steps

1. Fund wallet with testnet tokens
2. Initialize contract: `curl -X POST http://localhost:8100/api/init ...`
3. Start agents and trigger vulnerability detection
4. Monitor logs for proof events

