# Midnight API Setup Guide

This guide explains how to set up and configure the Midnight FastAPI server for ZK proof submission.

## Overview

The Midnight FastAPI server (`contracts/midnight/api/python/main.py`) provides a microservice interface for interacting with the Midnight Network. The Judge Agent uses this API to submit zero-knowledge proofs of audits.

## Architecture

```
Judge Agent → midnight_client.py → Midnight FastAPI Server → Midnight Network
```

The `midnight_client.py` module acts as a client that sends HTTP requests to the FastAPI server, which handles all Midnight SDK interactions.

## Prerequisites

1. **Midnight FastAPI Server** must be running
2. **Node.js** and **TypeScript** for contract operations
3. **Midnight SDK** configured (see `midnight-dev/README.md`)

## Installation

### 1. Start Midnight FastAPI Server

```bash
cd contracts/midnight/api/python
python main.py
```

The server runs on port 8000 by default (configurable via `PORT` environment variable).

### 2. Verify Server Health

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "initialized": false,
  "contract_address": null
}
```

## Configuration

Add these environment variables to your `.env` file:

```bash
# Midnight Integration
MIDNIGHT_API_URL=http://localhost:8000
MIDNIGHT_DEVNET_URL=http://localhost:6300
MIDNIGHT_BRIDGE_URL=http://localhost:3000
MIDNIGHT_CONTRACT_ADDRESS=
MIDNIGHT_SIMULATION_MODE=false
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MIDNIGHT_API_URL` | `http://localhost:8000` | FastAPI server URL |
| `MIDNIGHT_DEVNET_URL` | `http://localhost:6300` | Midnight devnet URL |
| `MIDNIGHT_BRIDGE_URL` | `http://localhost:3000` | Midnight bridge URL |
| `MIDNIGHT_CONTRACT_ADDRESS` | (empty) | Contract address (if already deployed) |
| `MIDNIGHT_SIMULATION_MODE` | `false` | Enable simulation mode (for testing) |

## Simulation Mode

**⚠️ WARNING**: Simulation mode should only be used for development and testing.

When `MIDNIGHT_SIMULATION_MODE=true`:
- Proofs are simulated (not submitted to real network)
- Health checks are bypassed
- Errors fall back to simulation instead of failing

**Production**: Always set `MIDNIGHT_SIMULATION_MODE=false` in production.

## Health Checks

The `midnight_client.py` module includes health checking:

```python
from midnight_client import check_midnight_health

# Check if Midnight API is healthy
is_healthy = await check_midnight_health()
```

Health checks are cached for 60 seconds to avoid excessive API calls.

## API Endpoints

The Midnight FastAPI server provides these endpoints:

### Health Check
```
GET /health
```

### Initialize Contract
```
POST /api/init
Body: {
  "mode": "deploy" | "join",
  "contract_address": "..." (required for join),
  "environment": "testnet" | "mainnet"
}
```

### Submit Audit Proof
```
POST /api/submit-audit
Body: {
  "audit_id": "...",
  "auditor_addr": "...",
  "threshold": 90,
  "witness": {
    "exploitString": [...],
    "riskScore": 95
  }
}
```

### Query Audit Status
```
POST /api/query-audit
Body: {
  "audit_id": "..."
}
```

See `contracts/midnight/api/python/main.py` for full API documentation.

## Error Handling

The `midnight_client.py` module handles errors gracefully:

1. **Health Check**: Checks API availability before submission
2. **Retry Logic**: Implements exponential backoff for transient failures
3. **Error Messages**: Provides clear error messages when API is unavailable
4. **Simulation Fallback**: Only in simulation mode (disabled by default)

### Error Scenarios

| Scenario | Behavior (Simulation OFF) | Behavior (Simulation ON) |
|----------|---------------------------|--------------------------|
| API unavailable | Raises exception with clear message | Falls back to simulation |
| API returns error | Raises exception | Falls back to simulation |
| Network timeout | Raises exception | Falls back to simulation |
| Health check fails | Raises exception | Falls back to simulation |

## Troubleshooting

### Midnight API Not Available

1. **Check if server is running:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check server logs:**
   ```bash
   # Look for errors in server output
   ```

3. **Verify environment variables:**
   ```python
   import os
   print("MIDNIGHT_API_URL:", os.getenv("MIDNIGHT_API_URL"))
   ```

### Proof Submission Fails

1. **Check contract initialization:**
   ```bash
   curl -X POST http://localhost:8000/api/init \
     -H "Content-Type: application/json" \
     -d '{"mode": "deploy", "environment": "testnet"}'
   ```

2. **Verify contract address:**
   ```bash
   curl http://localhost:8000/health
   # Check "contract_address" in response
   ```

3. **Check Midnight network connection:**
   ```bash
   curl http://localhost:8000/network/health
   ```

### Health Check Fails

1. **Verify server is accessible:**
   ```bash
   ping localhost
   telnet localhost 8000
   ```

2. **Check firewall/network settings**

3. **Verify MIDNIGHT_API_URL environment variable**

## Integration with Judge Agent

The Judge Agent automatically uses the Midnight API when submitting proofs:

```python
from midnight_client import submit_audit_proof

proof_hash = await submit_audit_proof(
    audit_id=audit_id,
    exploit_string=exploit_string,
    risk_score=risk_score,
    auditor_id=judge_address,
    threshold=90
)
```

The client handles:
- Health checks
- Error handling
- Retry logic
- Simulation mode (if enabled)

## Production Checklist

- [ ] Midnight FastAPI server is running and accessible
- [ ] `MIDNIGHT_SIMULATION_MODE=false` in production
- [ ] Contract is initialized (`/api/init` called)
- [ ] Health checks are passing
- [ ] Network connectivity verified
- [ ] Error monitoring configured
- [ ] Logs are being collected

## Additional Resources

- [Midnight Network Documentation](https://docs.midnight.network)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Contract Integration Guide](../midnight-dev/README.md)

