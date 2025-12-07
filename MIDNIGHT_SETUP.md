# Midnight Network Setup Guide

This guide covers setting up both the local proof server and testnet endpoints for Midnight Network integration.

## Current Setup Status

✅ **Proof Server**: Running on port 6300  
✅ **Midnight API**: Running on port 8100  
✅ **Testnet Endpoints**: Configured

## 1. Local Proof Server Setup

The proof server is required for generating zero-knowledge proofs locally.

### Start Proof Server

```bash
# Stop any existing proof server
docker stop midnight-proof-server 2>/dev/null || true
docker rm midnight-proof-server 2>/dev/null || true

# Start proof server (testnet mode)
docker run -d -p 6300:6300 --name midnight-proof-server \
  midnightnetwork/proof-server:4.0.0 -- \
  'midnight-proof-server --network testnet'

# Verify it's running
curl http://localhost:6300/health
# Should return: "We're alive 🎉!"
```

### Proof Server Status

```bash
# Check if running
docker ps | grep midnight-proof-server

# View logs
docker logs midnight-proof-server --tail 50

# Stop server
docker stop midnight-proof-server
```

## 2. Testnet Endpoints Configuration

The following testnet endpoints are configured:

- **Indexer**: `https://indexer.testnet-02.midnight.network/api/v1/graphql`
- **Indexer WS**: `wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws`
- **RPC Node**: `https://rpc.testnet-02.midnight.network`
- **Proof Server**: `http://localhost:6300` (local) or testnet endpoint

### Environment Variables

Set these in `agent/.env`:

```bash
MIDNIGHT_API_URL=http://localhost:8100
MIDNIGHT_PROOF_SERVER=http://localhost:6300
MIDNIGHT_INDEXER=https://indexer.testnet-02.midnight.network/api/v1/graphql
MIDNIGHT_INDEXER_WS=wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws
MIDNIGHT_NODE=https://rpc.testnet-02.midnight.network
MIDNIGHT_ENVIRONMENT=testnet
```

Or export them before starting the API:

```bash
export MIDNIGHT_PROOF_SERVER=http://localhost:6300
export MIDNIGHT_INDEXER=https://indexer.testnet-02.midnight.network/api/v1/graphql
export MIDNIGHT_INDEXER_WS=wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws
export MIDNIGHT_NODE=https://rpc.testnet-02.midnight.network
```

## 3. Starting the Midnight API

```bash
cd contracts/midnight/api
PORT=8100 python3 python/main.py
```

Or with environment variables:

```bash
cd contracts/midnight/api
export MIDNIGHT_PROOF_SERVER=http://localhost:6300
export MIDNIGHT_INDEXER=https://indexer.testnet-02.midnight.network/api/v1/graphql
export MIDNIGHT_INDEXER_WS=wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws
export MIDNIGHT_NODE=https://rpc.testnet-02.midnight.network
PORT=8100 python3 python/main.py
```

## 4. Testing Contract Deployment

```bash
# Run the test script
./test-midnight-init.sh
```

### Expected Output

If successful, you'll see:
```
✅ Contract Address: <contract_address>
```

### Common Issues

#### Insufficient Funds Error

If you see "Not sufficient funds", you need testnet tokens:

1. **Get Testnet Tokens**: Visit Midnight testnet faucet (if available)
2. **Use Funded Wallet**: Set `MIDNIGHT_MNEMONIC` to a wallet with testnet tokens
3. **Use Devnet**: For local testing without tokens, use a full devnet setup

#### Proof Server Connection Error

If you see "ECONNREFUSED 127.0.0.1:6300":

1. Check if proof server is running: `docker ps | grep midnight-proof-server`
2. Start it: See "Start Proof Server" section above
3. Verify health: `curl http://localhost:6300/health`

## 5. Obtaining Contract Address

After successful deployment, the contract address will be displayed by the test script.

To save it to your `.env` file:

```bash
# Extract and save contract address
CONTRACT_ADDRESS=$(./test-midnight-init.sh 2>&1 | grep "Contract Address:" | cut -d: -f2 | xargs)
echo "MIDNIGHT_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}" >> agent/.env
```

Or manually:

```bash
echo "MIDNIGHT_CONTRACT_ADDRESS=<your_contract_address>" >> agent/.env
```

## 6. Docker Compose Setup

To run everything with Docker Compose:

```bash
# Start proof server and API
docker compose --profile midnight up midnight-proof-server midnight-api -d

# Check status
docker compose ps

# View logs
docker compose logs midnight-api --tail 50
```

## 7. Troubleshooting

### Check All Services

```bash
# Proof server
curl http://localhost:6300/health

# Midnight API
curl http://localhost:8100/health

# Check Docker containers
docker ps | grep midnight
```

### View Logs

```bash
# Proof server logs
docker logs midnight-proof-server --tail 50

# API logs (if running in background)
tail -50 /tmp/midnight-api-8100.log
```

### Reset Everything

```bash
# Stop all services
docker stop midnight-proof-server 2>/dev/null
pkill -f "python.*main.py"

# Clean up
docker rm midnight-proof-server 2>/dev/null

# Restart
docker run -d -p 6300:6300 --name midnight-proof-server \
  midnightnetwork/proof-server:4.0.0 -- \
  'midnight-proof-server --network testnet'

cd contracts/midnight/api
PORT=8100 python3 python/main.py
```

## Next Steps

1. ✅ Proof server running on port 6300
2. ✅ Midnight API running on port 8100
3. ✅ Testnet endpoints configured
4. ⚠️  Get testnet tokens for contract deployment
5. ✅ Deploy contract and obtain address
6. ✅ Save contract address to `.env`

