#!/bin/bash
# Test script for Midnight API endpoints

set -e

MIDNIGHT_API_URL="${MIDNIGHT_API_URL:-http://localhost:8100}"

echo "🔍 Testing Midnight API at ${MIDNIGHT_API_URL}..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${CYAN}Test 1: Health Check${NC}"
if curl -f -s "${MIDNIGHT_API_URL}/health" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    curl -s "${MIDNIGHT_API_URL}/health" | jq '.' 2>/dev/null || curl -s "${MIDNIGHT_API_URL}/health"
else
    echo -e "${RED}❌ Health check failed - is the API running?${NC}"
    echo "   Start with: PORT=8100 python contracts/midnight/api/python/main.py"
    exit 1
fi
echo ""

# Test 2: Initialize Contract (Deploy)
echo -e "${CYAN}Test 2: Initialize Contract (Deploy Mode)${NC}"
INIT_RESPONSE=$(curl -s -X POST "${MIDNIGHT_API_URL}/api/init" \
    -H "Content-Type: application/json" \
    -d '{
        "mode": "deploy",
        "environment": "testnet"
    }')

echo "$INIT_RESPONSE" | jq '.' 2>/dev/null || echo "$INIT_RESPONSE"

SUCCESS=$(echo "$INIT_RESPONSE" | jq -r '.success' 2>/dev/null || echo "false")
if [ "$SUCCESS" = "true" ]; then
    echo -e "${GREEN}✅ Contract initialized successfully${NC}"
    CONTRACT_ADDRESS=$(echo "$INIT_RESPONSE" | jq -r '.contract_address' 2>/dev/null)
    if [ -n "$CONTRACT_ADDRESS" ] && [ "$CONTRACT_ADDRESS" != "null" ]; then
        echo -e "${GREEN}   Contract Address: ${CONTRACT_ADDRESS}${NC}"
    fi
else
    ERROR=$(echo "$INIT_RESPONSE" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Unknown error")
    echo -e "${YELLOW}⚠️  Contract initialization: ${ERROR}${NC}"
fi
echo ""

# Test 3: Query Audit (should fail if no audits exist)
echo -e "${CYAN}Test 3: Query Audit (test audit)${NC}"
QUERY_RESPONSE=$(curl -s -X POST "${MIDNIGHT_API_URL}/api/query-audit" \
    -H "Content-Type: application/json" \
    -d '{
        "audit_id": "test_audit_123"
    }')

echo "$QUERY_RESPONSE" | jq '.' 2>/dev/null || echo "$QUERY_RESPONSE"

FOUND=$(echo "$QUERY_RESPONSE" | jq -r '.found' 2>/dev/null || echo "false")
if [ "$FOUND" = "false" ]; then
    echo -e "${YELLOW}⚠️  Audit not found (expected for test audit)${NC}"
else
    echo -e "${GREEN}✅ Audit query successful${NC}"
fi
echo ""

# Test 4: Get Ledger State
echo -e "${CYAN}Test 4: Get Ledger State${NC}"
LEDGER_RESPONSE=$(curl -s -X GET "${MIDNIGHT_API_URL}/api/ledger")
echo "$LEDGER_RESPONSE" | jq '.' 2>/dev/null || echo "$LEDGER_RESPONSE"
echo ""

echo -e "${GREEN}✅ All tests complete!${NC}"

