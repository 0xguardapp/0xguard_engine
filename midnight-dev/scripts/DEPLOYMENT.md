# AuditVerifier Contract Deployment Guide

## Overview

The `deploy-audit-verifier.ts` script provides a production-ready deployment solution for the AuditVerifier contract on Midnight Network.

## Features

✅ **Network Support**: Devnet, Testnet, and Mainnet  
✅ **Automatic Compilation**: Compiles Compact contract before deployment  
✅ **Retry Logic**: 3 automatic retries with exponential backoff  
✅ **Error Handling**: Comprehensive error handling for network issues  
✅ **Contract Validation**: Validates contract address format  
✅ **Deployment Verification**: Verifies contract is accessible after deployment  
✅ **Environment Management**: Saves contract address to `.env` and `deployment-info.json`  
✅ **Gas Estimation**: Tracks deployment transaction details  
✅ **Force Redeploy**: `--force` flag to redeploy even if contract exists  

## Prerequisites

1. **Node.js** >= 18.0.0
2. **Docker** (for local devnet)
3. **Midnight devnet running** (for devnet deployment)
4. **Environment variables configured** (see `.env.example`)

## Quick Start

### Deploy to Devnet

```bash
# Start devnet first
npm run devnet:start

# Deploy contract
npm run deploy

# Or with force flag
npm run deploy:force
```

### Deploy to Testnet

```bash
# Set network in .env or use --network flag
MIDNIGHT_NETWORK=testnet npm run deploy

# Or via command line
tsx scripts/deploy-audit-verifier.ts --network=testnet
```

## Usage

### Basic Deployment

```bash
npm run deploy
```

### Force Redeployment

```bash
npm run deploy:force
# or
tsx scripts/deploy-audit-verifier.ts --force
```

### Specify Network

```bash
tsx scripts/deploy-audit-verifier.ts --network=testnet
tsx scripts/deploy-audit-verifier.ts --network=devnet
tsx scripts/deploy-audit-verifier.ts --network=mainnet
```

### Verbose Logging

```bash
MIDNIGHT_VERBOSE=true npm run deploy
```

## Configuration

### Environment Variables

The script reads configuration from `.env` file:

```bash
# Network
MIDNIGHT_NETWORK=devnet  # or testnet, mainnet

# Devnet endpoints (defaults)
MIDNIGHT_NODE=http://127.0.0.1:6300
MIDNIGHT_INDEXER=http://127.0.0.1:6300/graphql
MIDNIGHT_INDEXER_WS=ws://127.0.0.1:6300/graphql/ws
MIDNIGHT_PROOF_SERVER=http://127.0.0.1:6300

# Testnet endpoints
MIDNIGHT_NODE=https://rpc.testnet-02.midnight.network
MIDNIGHT_INDEXER=https://indexer.testnet-02.midnight.network/api/v1/graphql
MIDNIGHT_INDEXER_WS=wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws

# Wallet (required for testnet/mainnet)
MIDNIGHT_MNEMONIC="your 24 word mnemonic phrase"

# State storage
MIDNIGHT_STATE_STORE=0xguard-deployment-state

# Logging
MIDNIGHT_VERBOSE=true
```

## Deployment Process

The script follows these steps:

1. **Compile Contract** - Compiles Compact contract to JavaScript
2. **Check Network** - Verifies network connection and proof server
3. **Setup Wallet** - Initializes wallet from mnemonic (if provided)
4. **Deploy Contract** - Deploys with retry logic (3 attempts)
5. **Verify Deployment** - Queries contract state to confirm deployment
6. **Save Info** - Saves contract address to `.env` and `deployment-info.json`

## Output

### Console Output

```
🌙 AuditVerifier Contract Deployment
============================================================

[1/6] Compiling Compact Contract
──────────────────────────────────────────────────────────
ℹ️  Running Compact compiler...
✅ Contract compiled successfully

[2/6] Checking Network Connection
──────────────────────────────────────────────────────────
ℹ️  Connecting to devnet...
✅ Network connection verified

[3/6] Setting Up Wallet
──────────────────────────────────────────────────────────
✅ Wallet initialized - Address: 0x...

[4/6] Deploying Contract (Attempt 1/3)
──────────────────────────────────────────────────────────
✅ Contract deployed successfully!
ℹ️  Contract Address: 0x...
ℹ️  Transaction Hash: 0x...
ℹ️  Block Height: 12345

[5/6] Verifying Deployment
──────────────────────────────────────────────────────────
✅ Contract found on network

[6/6] Saving Deployment Information
──────────────────────────────────────────────────────────
✅ Contract address saved to .env
✅ Deployment info saved to deployment-info.json

============================================================
🎉 Deployment Complete!
============================================================

Contract Address: 0x...
Transaction Hash: 0x...
Verification Status: ✅ Verified
```

### Files Created

1. **`.env`** - Updated with `MIDNIGHT_CONTRACT_ADDRESS`
2. **`deployment-info.json`** - Complete deployment information:

```json
{
  "contractAddress": "0x...",
  "transactionHash": "0x...",
  "network": "devnet",
  "deployedAt": "2024-12-04T20:00:00.000Z",
  "blockHeight": 12345
}
```

## Error Handling

### Network Issues

The script includes retry logic for network failures:

- **3 automatic retries** with exponential backoff
- **Connection timeout** detection
- **Proof server** availability checks

### Common Errors

**"Contract compilation failed"**
- Ensure Compact compiler is installed
- Check contract syntax
- Verify contract file exists

**"Network connection failed"**
- Verify devnet is running: `npm run devnet:verify`
- Check RPC endpoint in `.env`
- Ensure proof server is accessible

**"Wallet setup failed"**
- Verify mnemonic is set in `.env`
- Check mnemonic format (24 words)
- For devnet, mnemonic is optional

**"Deployment failed after all retries"**
- Check network connectivity
- Verify wallet has sufficient balance (testnet/mainnet)
- Review error logs for specific issues

## Verification

After deployment, verify the contract:

```bash
# Check deployment info
cat deployment-info.json

# Verify contract address in .env
grep MIDNIGHT_CONTRACT_ADDRESS .env

# Query contract state (if integration layer available)
npm run integration:test
```

## Troubleshooting

### Devnet Not Running

```bash
# Start devnet
npm run devnet:start

# Verify it's running
npm run devnet:verify
```

### Contract Already Deployed

```bash
# Use --force to redeploy
npm run deploy:force
```

### Compilation Errors

```bash
# Clean and rebuild
cd ../contracts/midnight
npm run clean
npm run build
cd ../../midnight-dev
npm run deploy
```

### Network Timeout

```bash
# Increase timeout or check network
MIDNIGHT_PROOF_SERVER=http://127.0.0.1:6300 npm run deploy
```

## Advanced Usage

### Custom State Store

```bash
MIDNIGHT_STATE_STORE=my-custom-store npm run deploy
```

### Custom ZK Config Path

The script automatically uses `../contracts/midnight/build` for ZK config.  
To use a custom path, modify the script or set environment variable.

### Deployment to Multiple Networks

```bash
# Deploy to devnet
MIDNIGHT_NETWORK=devnet npm run deploy

# Deploy to testnet
MIDNIGHT_NETWORK=testnet npm run deploy
```

## Production Deployment

For production (mainnet) deployment:

1. **Set network**: `MIDNIGHT_NETWORK=mainnet`
2. **Set mnemonic**: Use secure wallet mnemonic
3. **Verify endpoints**: Ensure mainnet endpoints are correct
4. **Test first**: Deploy to testnet first
5. **Monitor**: Watch deployment logs carefully
6. **Verify**: Always verify contract after deployment

## Security Notes

⚠️ **Never commit `.env` file** with mnemonic  
⚠️ **Use secure storage** for production mnemonics  
⚠️ **Verify contract address** before using in production  
⚠️ **Test on devnet/testnet** before mainnet deployment  

## Support

For issues or questions:
- Check [README.md](../README.md) for general setup
- Review [VERIFICATION.md](../VERIFICATION.md) for devnet verification
- See Midnight Network docs: https://docs.midnight.network/

