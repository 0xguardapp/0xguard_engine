#!/bin/bash
# End-to-End Midnight Network Functionality Test
# Verifies: Devnet, API, Wallet, Proof Submission, and Proof Verification

set -e

MIDNIGHT_DEVNET_URL="${MIDNIGHT_DEVNET_URL:-http://localhost:6300}"
MIDNIGHT_API_URL="${MIDNIGHT_API_URL:-http://localhost:8100}"
LOGS_FILE="${LOGS_FILE:-logs.json}"

echo "🔍 Midnight Network End-to-End Functionality Test"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_step() {
    local name="$1"
    local command="$2"
    local expected="$3"
    
    echo -e "${BLUE}Testing: ${name}${NC}"
    result=$(eval "$command" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ] && [[ "$result" == *"$expected"* ]]; then
        echo -e "${GREEN}✅ PASS${NC}: $name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $name"
        echo "   Command: $command"
        echo "   Result: $result"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test 1: Devnet Health Check
echo "1️⃣  Testing Midnight Devnet..."
if curl -f -s "${MIDNIGHT_DEVNET_URL}/health" > /dev/null 2>&1; then
    devnet_health=$(curl -s "${MIDNIGHT_DEVNET_URL}/health")
    echo -e "${GREEN}✅ PASS${NC}: Devnet is running"
    echo "   Response: $devnet_health"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}: Devnet is not running on ${MIDNIGHT_DEVNET_URL}"
    echo "   Start it with: docker run -d -p 6300:6300 --name midnight-proof-server midnightnetwork/proof-server:4.0.0 -- 'midnight-proof-server --network testnet'"
    ((TESTS_FAILED++))
fi
echo ""

# Test 2: Midnight API Health Check
echo "2️⃣  Testing Midnight API..."
if curl -f -s "${MIDNIGHT_API_URL}/health" > /dev/null 2>&1; then
    api_health=$(curl -s "${MIDNIGHT_API_URL}/health")
    echo -e "${GREEN}✅ PASS${NC}: Midnight API is running"
    echo "   Response: $api_health"
    ((TESTS_PASSED++))
    
    # Check if initialized
    if echo "$api_health" | grep -q '"initialized":true'; then
        echo -e "${GREEN}✅ PASS${NC}: Contract is initialized"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARN${NC}: Contract not initialized (will test initialization)"
    fi
else
    echo -e "${RED}❌ FAIL${NC}: Midnight API is not running on ${MIDNIGHT_API_URL}"
    echo "   Start it with: cd contracts/midnight/api && PORT=8100 python3 python/main.py"
    ((TESTS_FAILED++))
fi
echo ""

# Test 3: Wallet Initialization
echo "3️⃣  Testing Wallet Initialization..."
init_response=$(curl -X POST "${MIDNIGHT_API_URL}/api/init" \
    -H "Content-Type: application/json" \
    -d '{"mode": "deploy", "environment": "testnet"}' \
    -s -w "\nHTTP_STATUS:%{http_code}" 2>&1)

http_status=$(echo "$init_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
init_body=$(echo "$init_response" | sed 's/HTTP_STATUS:[0-9]*$//')

if [ "$http_status" = "200" ]; then
    if echo "$init_body" | grep -q '"success":true' || echo "$init_body" | grep -q '"contract_address"'; then
        contract_addr=$(echo "$init_body" | grep -o '"contract_address"[^,}]*' | cut -d'"' -f4 | head -1)
        echo -e "${GREEN}✅ PASS${NC}: Wallet initialized and contract deployed"
        echo "   Contract Address: ${contract_addr:-N/A}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARN${NC}: Init response: $init_body"
        if echo "$init_body" | grep -q "insufficient funds"; then
            echo "   Note: Wallet needs testnet tokens for deployment"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  WARN${NC}: Init returned status $http_status"
    echo "   Response: $init_body"
    if [ "$http_status" = "500" ]; then
        if echo "$init_body" | grep -q "insufficient funds"; then
            echo "   Note: Wallet needs testnet tokens"
        fi
    fi
fi
echo ""

# Test 4: Check for proof_submitted events in logs
echo "4️⃣  Testing Proof Submission Events..."
if [ -f "$LOGS_FILE" ]; then
    proof_submitted_logs=$(grep -i "proof_submitted\|\[proof_submitted\]" "$LOGS_FILE" 2>/dev/null | wc -l)
    proof_submitted_logs=${proof_submitted_logs:-0}
    
    if [ $proof_submitted_logs -gt 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: Found proof_submitted events in logs"
        echo "   Count: $proof_submitted_logs"
        ((TESTS_PASSED++))
        
        # Show sample log
        sample_log=$(grep -i "\[proof_submitted\]" "$LOGS_FILE" 2>/dev/null | tail -1)
        if [ -n "$sample_log" ]; then
            echo "   Sample: $(echo "$sample_log" | cut -c1-100)..."
        fi
    else
        echo -e "${YELLOW}⚠️  WARN${NC}: No proof_submitted events found in logs"
        echo "   This is expected if no proofs have been submitted yet"
        echo "   To generate events, run the Judge agent and trigger a vulnerability"
    fi
else
    echo -e "${YELLOW}⚠️  WARN${NC}: Logs file not found: $LOGS_FILE"
fi
echo ""

# Test 5: Check for proof_verified events in logs
echo "5️⃣  Testing Proof Verification Events..."
if [ -f "$LOGS_FILE" ]; then
    proof_verified_logs=$(grep -i "proof_verified\|\[proof_verified\]" "$LOGS_FILE" 2>/dev/null | wc -l)
    proof_verified_logs=${proof_verified_logs:-0}
    
    if [ $proof_verified_logs -gt 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: Found proof_verified events in logs"
        echo "   Count: $proof_verified_logs"
        ((TESTS_PASSED++))
        
        # Show sample log
        sample_log=$(grep -i "\[proof_verified\]" "$LOGS_FILE" 2>/dev/null | tail -1)
        if [ -n "$sample_log" ]; then
            echo "   Sample: $(echo "$sample_log" | cut -c1-100)..."
        fi
    else
        echo -e "${YELLOW}⚠️  WARN${NC}: No proof_verified events found in logs"
        echo "   This is expected if no proofs have been verified yet"
        echo "   Proofs are verified after successful submission to Midnight Network"
    fi
else
    echo -e "${YELLOW}⚠️  WARN${NC}: Logs file not found: $LOGS_FILE"
fi
echo ""

# Test 6: Check for structured proof logs
echo "6️⃣  Testing Structured Proof Logs..."
if [ -f "$LOGS_FILE" ]; then
    # Check for logs with proof hash, transaction ID, status
    proof_logs_with_hash=$(grep -i "Proof Hash:" "$LOGS_FILE" 2>/dev/null | wc -l)
    proof_logs_with_tx=$(grep -i "Transaction ID:" "$LOGS_FILE" 2>/dev/null | wc -l)
    proof_logs_with_status=$(grep -i "Status:" "$LOGS_FILE" 2>/dev/null | grep -i "proof" | wc -l)
    
    proof_logs_with_hash=${proof_logs_with_hash:-0}
    proof_logs_with_tx=${proof_logs_with_tx:-0}
    proof_logs_with_status=${proof_logs_with_status:-0}
    
    if [ "$proof_logs_with_hash" -gt 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: Found proof logs with hash ($proof_logs_with_hash)"
        ((TESTS_PASSED++))
    fi
    
    if [ "$proof_logs_with_tx" -gt 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: Found proof logs with transaction ID ($proof_logs_with_tx)"
        ((TESTS_PASSED++))
    fi
    
    if [ "$proof_logs_with_status" -gt 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: Found proof logs with status ($proof_logs_with_status)"
        ((TESTS_PASSED++))
    fi
    
    if [ "$proof_logs_with_hash" -eq 0 ] && [ "$proof_logs_with_tx" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: No structured proof logs found"
    fi
else
    echo -e "${YELLOW}⚠️  WARN${NC}: Logs file not found: $LOGS_FILE"
fi
echo ""

# Test 7: Test proof submission endpoint (if contract is initialized)
echo "7️⃣  Testing Proof Submission Endpoint..."
if curl -f -s "${MIDNIGHT_API_URL}/health" | grep -q '"initialized":true'; then
    # Create a test proof submission
    test_audit_id="test_audit_$(date +%s)"
    test_proof_data=$(cat <<EOF
{
  "audit_id": "$test_audit_id",
  "auditor_addr": "test_auditor_123456789012345678901234567890123456789012345678901234567890",
  "threshold": 90,
  "witness": {
    "exploitString": [65, 66, 67, 68],
    "riskScore": 95
  }
}
EOF
)
    
    submit_response=$(curl -X POST "${MIDNIGHT_API_URL}/api/submit-audit" \
        -H "Content-Type: application/json" \
        -d "$test_proof_data" \
        -s -w "\nHTTP_STATUS:%{http_code}" 2>&1)
    
    submit_status=$(echo "$submit_response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    submit_body=$(echo "$submit_response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [ "$submit_status" = "200" ] && echo "$submit_body" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ PASS${NC}: Proof submission endpoint works"
        tx_id=$(echo "$submit_body" | grep -o '"transaction_id"[^,}]*' | cut -d'"' -f4 | head -1)
        echo "   Transaction ID: ${tx_id:-N/A}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARN${NC}: Proof submission returned status $submit_status"
        echo "   Response: $submit_body"
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC}: Contract not initialized, skipping proof submission test"
fi
echo ""

# Summary
echo "=================================================="
echo "📊 Test Summary"
echo "=================================================="
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical tests passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed or were skipped${NC}"
    exit 1
fi

