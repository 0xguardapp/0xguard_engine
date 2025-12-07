#!/bin/bash
# Quick test for Midnight API init endpoint

MIDNIGHT_API_URL="${MIDNIGHT_API_URL:-http://localhost:8100}"

echo "🚀 Testing Midnight API Init Endpoint"
echo "URL: ${MIDNIGHT_API_URL}/api/init"
echo ""

# Check if API is running
echo "🔍 Checking if Midnight API is running..."
if ! curl -f -s "${MIDNIGHT_API_URL}/health" > /dev/null 2>&1; then
    echo "❌ Midnight API is not running on ${MIDNIGHT_API_URL}"
    echo ""
    echo "To start the API, run one of:"
    echo "  1. cd contracts/midnight/api && PORT=8100 python python/main.py"
    echo "  2. docker compose --profile midnight up midnight-api"
    echo "  3. pm2 start 0xguard-midnight-api"
    echo ""
    exit 1
fi

echo "✅ API is running"
echo ""

# Test deploy mode
echo "📝 Testing deploy mode..."
RESPONSE=$(curl -X POST "${MIDNIGHT_API_URL}/api/init" \
    -H "Content-Type: application/json" \
    -d '{
        "mode": "deploy",
        "environment": "testnet"
    }' \
    -w "\nHTTP_STATUS:%{http_code}" \
    -s)

# Extract HTTP status
HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo ""
echo "Response:"
if command -v jq &> /dev/null; then
    echo "$BODY" | jq '.'
else
    echo "$BODY"
fi

echo ""
echo "HTTP Status: ${HTTP_STATUS}"

# Extract contract address from JSON response
CONTRACT_ADDRESS=$(echo "$BODY" | grep -o '"contract_address"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)

# Also try to extract from detail field if it's nested
if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" = "null" ]; then
    CONTRACT_ADDRESS=$(echo "$BODY" | grep -o '"contract_address"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4)
fi

# Check if there's an error about proof server
if echo "$BODY" | grep -q "ECONNREFUSED.*6300\|proof.*server\|prove-tx"; then
    echo ""
    echo "⚠️  Proof server (Midnight devnet) is not running on port 6300"
    echo ""
    echo "To start the proof server:"
    echo "  docker run -d -p 6300:6300 --name midnight-proof-server midnightnetwork/proof-server:4.0.0 -- 'midnight-proof-server --network testnet'"
    echo ""
    echo "Or use testnet endpoints by setting:"
    echo "  export MIDNIGHT_PROOF_SERVER=https://proof-server.testnet-02.midnight.network"
    echo ""
fi

# Check if there's an error about insufficient funds
if echo "$BODY" | grep -qi "insufficient funds\|not sufficient funds"; then
    echo ""
    echo "⚠️  Insufficient funds in wallet for contract deployment"
    echo ""
    echo "For testnet deployment, you need testnet tokens. Options:"
    echo "  1. Get testnet tokens from Midnight testnet faucet"
    echo "  2. Use a wallet that already has testnet tokens"
    echo "  3. Use local devnet instead (requires devnet setup)"
    echo ""
    echo "Current wallet address:"
    echo "$(echo "$BODY" | grep -o "mn_shield-addr_[^\"]*" | head -1)"
    echo ""
fi

if [ -n "$CONTRACT_ADDRESS" ] && [ "$CONTRACT_ADDRESS" != "null" ] && [ -n "$CONTRACT_ADDRESS" ]; then
    echo ""
    echo "✅ Contract Address: ${CONTRACT_ADDRESS}"
    echo ""
    echo "To save this to your .env file:"
    echo "  echo 'MIDNIGHT_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}' >> agent/.env"
    echo ""
    echo "Or export it:"
    echo "  export MIDNIGHT_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}"
else
    if [ "$HTTP_STATUS" = "200" ]; then
        echo ""
        echo "⚠️  No contract address in response (check the response above)"
    fi
fi

echo ""
echo "✅ Test complete"

