import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates Ethereum address format
 */
function isValidEthereumAddress(address: string): boolean {
  // Basic Ethereum address validation (0x followed by 40 hex characters)
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}

/**
 * Validates audit intensity value
 */
function isValidIntensity(intensity: string | undefined): boolean {
  if (!intensity) return true; // Optional parameter
  const validIntensities = ['quick', 'deep'];
  return validIntensities.includes(intensity.toLowerCase());
}

/**
 * POST /api/audit/start
 * Starts a new audit by deploying agent swarm
 * 
 * Request body:
 * - targetAddress: string (required) - Ethereum address to audit
 * - intensity: string (optional) - Audit intensity: 'quick' or 'deep' (default: 'quick')
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[POST /api/audit/start] Request received');
  
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log('[POST /api/audit/start] Request body:', { 
        targetAddress: body.targetAddress ? `${body.targetAddress.substring(0, 10)}...` : 'missing',
        intensity: body.intensity || 'not provided'
      });
    } catch (parseError) {
      console.error('[POST /api/audit/start] JSON parse error:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          message: parseError instanceof Error ? parseError.message : 'Failed to parse request body'
        },
        { status: 400 }
      );
    }

    const { targetAddress, intensity } = body;

    // Input validation: targetAddress is required
    if (!targetAddress) {
      console.warn('[POST /api/audit/start] Missing targetAddress');
      return NextResponse.json(
        {
          success: false,
          error: 'Target address is required',
          field: 'targetAddress'
        },
        { status: 400 }
      );
    }

    // Input validation: targetAddress must be a string
    if (typeof targetAddress !== 'string') {
      console.warn('[POST /api/audit/start] Invalid targetAddress type:', typeof targetAddress);
      return NextResponse.json(
        {
          success: false,
          error: 'Target address must be a string',
          field: 'targetAddress',
          received: typeof targetAddress
        },
        { status: 400 }
      );
    }

    // Input validation: targetAddress format
    const trimmedAddress = targetAddress.trim();
    if (trimmedAddress.length === 0) {
      console.warn('[POST /api/audit/start] Empty targetAddress');
      return NextResponse.json(
        {
          success: false,
          error: 'Target address cannot be empty',
          field: 'targetAddress'
        },
        { status: 400 }
      );
    }

    // Validate Ethereum address format (if it looks like an Ethereum address)
    if (trimmedAddress.startsWith('0x') && !isValidEthereumAddress(trimmedAddress)) {
      console.warn('[POST /api/audit/start] Invalid Ethereum address format:', trimmedAddress.substring(0, 10));
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Ethereum address format. Expected 0x followed by 40 hex characters',
          field: 'targetAddress'
        },
        { status: 400 }
      );
    }

    // Input validation: intensity (optional)
    if (intensity !== undefined && typeof intensity !== 'string') {
      console.warn('[POST /api/audit/start] Invalid intensity type:', typeof intensity);
      return NextResponse.json(
        {
          success: false,
          error: 'Intensity must be a string',
          field: 'intensity',
          received: typeof intensity
        },
        { status: 400 }
      );
    }

    const normalizedIntensity = intensity?.trim().toLowerCase() || 'quick';
    if (!isValidIntensity(normalizedIntensity)) {
      console.warn('[POST /api/audit/start] Invalid intensity value:', normalizedIntensity);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid intensity value',
          field: 'intensity',
          validValues: ['quick', 'deep'],
          received: intensity
        },
        { status: 400 }
      );
    }

    console.log('[POST /api/audit/start] Validation passed, checking agent API health...');

    // Call agent backend API to start agents
    const agentApiUrl = process.env.AGENT_API_URL || 'http://localhost:8003';
    const timeout = 30000; // 30 second timeout
    
    console.log(`[POST /api/audit/start] Agent API URL: ${agentApiUrl}`);
    
    // Health check before attempting to start agents
    try {
      const healthController = new AbortController();
      const healthTimeoutId = setTimeout(() => healthController.abort(), 5000); // 5s timeout for health check
      
      const healthResponse = await fetch(`${agentApiUrl}/health`, {
        method: 'GET',
        headers: { 'User-Agent': '0xGuard-Frontend/1.0' },
        signal: healthController.signal
      });
      
      clearTimeout(healthTimeoutId);
      
      if (!healthResponse.ok) {
        console.warn(`[POST /api/audit/start] Agent API health check returned status ${healthResponse.status}`);
        return NextResponse.json(
          {
            success: false,
            error: 'Agent API server is not healthy',
            message: `Health check returned status ${healthResponse.status}. Please ensure the agent API server is running.`,
            agentApiUrl
          },
          { status: 503 }
        );
      }
      
      const healthData = await healthResponse.json();
      console.log('[POST /api/audit/start] Agent API health check passed:', healthData);
    } catch (healthError) {
      if (healthError instanceof Error && healthError.name === 'AbortError') {
        console.error('[POST /api/audit/start] Agent API health check timeout');
      } else {
        console.error('[POST /api/audit/start] Agent API health check failed:', healthError);
      }
      
      return NextResponse.json(
        {
          success: false,
          error: 'Agent API server is unavailable',
          message: 'Unable to connect to agent API server. Please ensure it is running on port 8003.',
          agentApiUrl,
          details: healthError instanceof Error ? healthError.message : 'Connection failed'
        },
        { status: 503 }
      );
    }
    
    console.log('[POST /api/audit/start] Agent API health check passed, starting agents...');
    
    try {
      const response = await fetch(`${process.env.AGENT_API_URL}/api/agents/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAddress: trimmedAddress, intensity: normalizedIntensity }),
      });

      console.log(`[POST /api/audit/start] Agent API response status: ${response.status}`);

      let data;
      try {
        data = await response.json();
        console.log('[POST /api/audit/start] Agent API response:', {
          success: data.success,
          hasAgents: !!data.agents,
          message: data.message?.substring(0, 50)
        });
      } catch (jsonError) {
        console.error('[POST /api/audit/start] Failed to parse agent API response:', jsonError);
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid response from agent API',
            status: response.status
          },
          { status: 502 }
        );
      }

      if (!response.ok) {
        console.error('[POST /api/audit/start] Agent API error:', {
          status: response.status,
          error: data.error,
          message: data.message
        });
        
        return NextResponse.json(
          {
            success: false,
            error: data.error || data.message || 'Failed to start agents',
            details: data.error ? undefined : data.message,
            statusCode: response.status
          },
          { status: response.status >= 500 ? 502 : response.status }
        );
      }

      // Generate audit ID from agent addresses or timestamp
      const auditId = data.agents
        ? `audit_${Date.now()}_${trimmedAddress.slice(2, 10)}`
        : `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      console.log('[POST /api/audit/start] Audit started successfully:', {
        auditId,
        hasAgents: !!data.agents,
        agentCount: data.agents ? Object.keys(data.agents).length : 0
      });

      const responseTime = Date.now() - startTime;
      console.log(`[POST /api/audit/start] Success (${responseTime}ms)`);

      return NextResponse.json(
        {
          success: true,
          auditId,
          message: data.message || 'Swarm deployed successfully',
          agents: data.agents,
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Response-Time': `${responseTime}ms`
          }
        }
      );
    } catch (fetchError) {
      const responseTime = Date.now() - startTime;
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[POST /api/audit/start] Agent API timeout:', timeout);
        return NextResponse.json(
          {
            success: false,
            error: 'Agent API request timeout',
            message: `Request to agent API exceeded ${timeout}ms timeout. The agent API server may be down or unresponsive.`
          },
          {
            status: 504,
            headers: {
              'X-Response-Time': `${responseTime}ms`
            }
          }
        );
      }

      console.error('[POST /api/audit/start] Agent API connection error:', fetchError);
      console.error('[POST /api/audit/start] Error details:', {
        message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        agentApiUrl,
        responseTime: `${responseTime}ms`
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to connect to agent API',
          message: fetchError instanceof Error 
            ? fetchError.message 
            : 'Make sure the agent API server is running on port 8003',
          agentApiUrl
        },
        {
          status: 503,
          headers: {
            'X-Response-Time': `${responseTime}ms`
          }
        }
      );
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[POST /api/audit/start] Unexpected error:', error);
    console.error('[POST /api/audit/start] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: `${responseTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to start audit'
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${responseTime}ms`
        }
      }
    );
  }
}





