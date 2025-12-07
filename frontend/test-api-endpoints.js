#!/usr/bin/env node
/**
 * API Endpoint Test Script
 * Tests all frontend API endpoints and agent API endpoints
 * 
 * Usage:
 *   node test-api-endpoints.js
 *   or
 *   npm run test:api
 * 
 * Environment Variables:
 *   AGENT_API_URL - Agent API server URL (default: http://localhost:8003)
 *   API_BASE_URL - Frontend API base URL (default: http://localhost:3000)
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8003';

const results = [];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bright: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function logResult(result) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
  const color = result.status === 'PASS' ? 'green' : result.status === 'FAIL' ? 'red' : 'yellow';
  
  log(`${icon} [${result.method}] ${result.endpoint} - ${result.status}`, color);
  if (result.statusCode) {
    log(`   Status: ${result.statusCode}`, 'cyan');
  }
  if (result.responseTime !== undefined) {
    const timeColor = result.responseTime < 1000 ? 'green' : result.responseTime < 3000 ? 'yellow' : 'red';
    log(`   Time: ${formatTime(result.responseTime)}`, timeColor);
  }
  if (result.error) {
    log(`   Error: ${result.error}`, 'red');
  }
  if (result.message) {
    log(`   ${result.message}`, 'yellow');
  }
  if (result.details) {
    log(`   ${result.details}`, 'cyan');
  }
}

async function testEndpoint(endpoint, method = 'GET', body, expectedStatus, baseUrl = BASE_URL) {
  const startTime = Date.now();
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;

    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = { text: await response.text() };
    }

    const result = {
      endpoint,
      method,
      status: expectedStatus
        ? response.status === expectedStatus
          ? 'PASS'
          : 'FAIL'
        : response.status < 400
        ? 'PASS'
        : 'FAIL',
      statusCode: response.status,
      responseTime,
      responseData,
    };

    if (result.status === 'FAIL') {
      result.error = responseData.error || responseData.message || responseData.detail || 'Unexpected status code';
    }

    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint,
      method,
      status: 'FAIL',
      responseTime,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

async function checkService(url, name, timeout = 2000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, { 
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForAgents(agentApiUrl, maxWait = 10000, interval = 500) {
  log('   ⏳ Waiting for agents to start...', 'yellow');
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const response = await fetch(`${agentApiUrl}/api/agents/status`);
      if (response.ok) {
        const data = await response.json();
        const allRunning = data.target === true && data.judge === true && data.red_team === true;
        if (allRunning) {
          return true;
        }
      }
    } catch {
      // Continue waiting
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

async function runTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🚀 Starting API Endpoint Tests', 'bright');
  log('='.repeat(60) + '\n', 'cyan');
  
  log(`Frontend Base URL: ${BASE_URL}`, 'blue');
  log(`Agent API URL: ${AGENT_API_URL}\n`, 'blue');

  // Check if services are running
  log('📡 Checking service availability...', 'cyan');
  const frontendRunning = await checkService(BASE_URL, 'Frontend');
  const agentApiRunning = await checkService(`${AGENT_API_URL}/health`, 'Agent API');

  log(`Frontend: ${frontendRunning ? '✅ Running' : '❌ Not running'}`, frontendRunning ? 'green' : 'red');
  log(`Agent API: ${agentApiRunning ? '✅ Running' : '❌ Not running'}`, agentApiRunning ? 'green' : 'red');
  log('');

  if (!frontendRunning) {
    log('⚠️  Frontend server is not running. Please start it first:', 'yellow');
    log('   cd frontend && npm run dev\n', 'yellow');
    process.exit(1);
  }

  if (!agentApiRunning) {
    log('⚠️  Agent API server is not running.', 'yellow');
    log('   Please start it first:', 'yellow');
    log('   cd agent && python api_server.py\n', 'yellow');
    log('   Tests will continue but agent-related tests will be skipped.\n', 'yellow');
  }

  log('📋 Running endpoint tests...\n', 'cyan');

  // ============================================================================
  // Frontend API Tests
  // ============================================================================
  
  log('━━━ Frontend API Tests ━━━', 'magenta');

  // Test 1: GET /api/audits
  log('Test 1: GET /api/audits', 'blue');
  results.push(await testEndpoint('/api/audits', 'GET', undefined, 200));

  // Test 2: GET /api/logs
  log('Test 2: GET /api/logs', 'blue');
  results.push(await testEndpoint('/api/logs', 'GET', undefined, 200));

  // Test 3: GET /api/logs with filters
  log('Test 3: GET /api/logs?category=attack&limit=5', 'blue');
  results.push(await testEndpoint('/api/logs?category=attack&limit=5', 'GET', undefined, 200));

  // Test 4: GET /api/agent-status
  log('Test 4: GET /api/agent-status', 'blue');
  let agentStatusResult = await testEndpoint('/api/agent-status', 'GET', undefined);
  if (agentStatusResult.status === 'FAIL' && agentStatusResult.statusCode === 503) {
    agentStatusResult.status = 'SKIP';
    agentStatusResult.message = 'Agent API not available (expected if not running)';
  }
  results.push(agentStatusResult);

  // Test 5: POST /api/audit/start - Valid request
  log('Test 5: POST /api/audit/start (valid)', 'blue');
  const startResult = await testEndpoint(
    '/api/audit/start',
    'POST',
    {
      targetAddress: '0x1234567890123456789012345678901234567890',
      intensity: 'quick',
    },
    agentApiRunning ? 200 : 503
  );
  results.push(startResult);

  // Test 6: POST /api/audit/start - Missing targetAddress
  log('Test 6: POST /api/audit/start (missing targetAddress - should fail)', 'blue');
  results.push(
    await testEndpoint(
      '/api/audit/start',
      'POST',
      { intensity: 'quick' },
      400
    )
  );

  // ============================================================================
  // Agent API Tests
  // ============================================================================
  
  log('\n━━━ Agent API Tests ━━━', 'magenta');

  if (!agentApiRunning) {
    log('⚠️  Skipping agent API tests (server not running)', 'yellow');
    results.push({
      endpoint: '/api/agents/*',
      method: 'SKIP',
      status: 'SKIP',
      message: 'Agent API server not running',
    });
  } else {
    // Test 7: GET /health
    log('Test 7: GET /health', 'blue');
    results.push(await testEndpoint('/health', 'GET', undefined, 200, AGENT_API_URL));

    // Test 8: GET /api/agents/status (before starting)
    log('Test 8: GET /api/agents/status (before start)', 'blue');
    const statusBeforeResult = await testEndpoint('/api/agents/status', 'GET', undefined, 200, AGENT_API_URL);
    if (statusBeforeResult.responseData) {
      const status = statusBeforeResult.responseData;
      statusBeforeResult.details = `target: ${status.target}, judge: ${status.judge}, red_team: ${status.red_team}`;
    }
    results.push(statusBeforeResult);

    // Test 9: POST /api/agents/start
    log('Test 9: POST /api/agents/start', 'blue');
    const startAgentsResult = await testEndpoint(
      '/api/agents/start',
      'POST',
      {
        targetAddress: '0x1234567890123456789012345678901234567890',
        intensity: 'quick',
      },
      200,
      AGENT_API_URL
    );
    
    if (startAgentsResult.status === 'PASS' && startAgentsResult.responseData) {
      const agents = startAgentsResult.responseData.agents;
      if (agents) {
        startAgentsResult.details = `target:${agents.target?.port}, judge:${agents.judge?.port}, red_team:${agents.red_team?.port}`;
      }
    }
    results.push(startAgentsResult);

    // Test 10: GET /api/agents/status (after starting) - Validate agents are running
    log('Test 10: GET /api/agents/status (after start) - Validating agents are running', 'blue');
    
    // Wait a bit for agents to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusAfterResult = await testEndpoint('/api/agents/status', 'GET', undefined, 200, AGENT_API_URL);
    
    if (statusAfterResult.status === 'PASS' && statusAfterResult.responseData) {
      const status = statusAfterResult.responseData;
      const allRunning = status.target === true && status.judge === true && status.red_team === true;
      
      if (allRunning) {
        statusAfterResult.details = '✅ All agents running: target=true, judge=true, red_team=true';
      } else {
        statusAfterResult.status = 'FAIL';
        statusAfterResult.error = `Not all agents are running. target=${status.target}, judge=${status.judge}, red_team=${status.red_team}`;
        statusAfterResult.details = `Expected all true, got: target=${status.target}, judge=${status.judge}, red_team=${status.red_team}`;
      }
    }
    results.push(statusAfterResult);

    // Test 11: POST /api/agents/start (duplicate - should handle gracefully)
    log('Test 11: POST /api/agents/start (duplicate - should fail gracefully)', 'blue');
    const duplicateStartResult = await testEndpoint(
      '/api/agents/start',
      'POST',
      {
        targetAddress: '0x1234567890123456789012345678901234567890',
        intensity: 'quick',
      },
      undefined, // Don't enforce specific status code
      AGENT_API_URL
    );
    
    if (duplicateStartResult.statusCode === 400 || duplicateStartResult.statusCode === 409) {
      duplicateStartResult.status = 'PASS';
      duplicateStartResult.message = 'Correctly rejected duplicate start request';
    } else if (duplicateStartResult.statusCode === 200) {
      duplicateStartResult.status = 'PASS';
      duplicateStartResult.message = 'Accepted (agents may have been restarted)';
    }
    results.push(duplicateStartResult);

    // Test 12: GET /api/agents/status (final check)
    log('Test 12: GET /api/agents/status (final check)', 'blue');
    const finalStatusResult = await testEndpoint('/api/agents/status', 'GET', undefined, 200, AGENT_API_URL);
    if (finalStatusResult.responseData) {
      const status = finalStatusResult.responseData;
      finalStatusResult.details = `target: ${status.target}, judge: ${status.judge}, red_team: ${status.red_team}`;
    }
    results.push(finalStatusResult);
  }

  // ============================================================================
  // Results Summary
  // ============================================================================
  
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Test Results Summary', 'bright');
  log('='.repeat(60) + '\n', 'cyan');
  
  results.forEach((result) => {
    logResult(result);
  });

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const total = results.length;

  log('\n' + '='.repeat(60), 'cyan');
  log(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`, 'bright');
  log('='.repeat(60) + '\n', 'cyan');

  // Calculate average response time
  const times = results.filter(r => r.responseTime !== undefined).map(r => r.responseTime);
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    log(`Average response time: ${formatTime(avgTime)}`, 'cyan');
  }

  if (failed > 0) {
    log('❌ Some tests failed. Check the errors above.', 'red');
    process.exit(1);
  } else if (skipped > 0 && passed > 0) {
    log('⚠️  Some tests were skipped, but all executed tests passed.', 'yellow');
    process.exit(0);
  } else {
    log('✅ All tests passed!', 'green');
    process.exit(0);
  }
}

// Run tests with graceful error handling
runTests().catch((error) => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
