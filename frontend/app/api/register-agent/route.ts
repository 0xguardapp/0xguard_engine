import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates Ethereum address format
 */
function isValidEthereumAddress(address: string): boolean {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}

/**
 * POST /api/register-agent
 * Registers an agent address with the backend Python Agent Registry
 * 
 * Request body:
 * - agent_address: string (required) - Ethereum address of the agent
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[POST /api/register-agent] Request received');

  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log('[POST /api/register-agent] Request body:', {
        agent_address: body.agent_address ? `${body.agent_address.substring(0, 10)}...` : 'missing'
      });
    } catch (parseError) {
      console.error('[POST /api/register-agent] JSON parse error:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          message: parseError instanceof Error ? parseError.message : 'Failed to parse request body'
        },
        { status: 400 }
      );
    }

    const { agent_address } = body;

    // Input validation: agent_address is required
    if (!agent_address) {
      console.warn('[POST /api/register-agent] Missing agent_address');
      return NextResponse.json(
        {
          success: false,
          error: 'Missing agent address',
          field: 'agent_address'
        },
        { status: 400 }
      );
    }

    // Input validation: agent_address must be a string
    if (typeof agent_address !== 'string') {
      console.warn('[POST /api/register-agent] Invalid agent_address type:', typeof agent_address);
      return NextResponse.json(
        {
          success: false,
          error: 'Agent address must be a string',
          field: 'agent_address',
          received: typeof agent_address
        },
        { status: 400 }
      );
    }

    // Input validation: agent_address format
    const trimmedAddress = agent_address.trim();
    if (trimmedAddress.length === 0) {
      console.warn('[POST /api/register-agent] Empty agent_address');
      return NextResponse.json(
        {
          success: false,
          error: 'Agent address cannot be empty',
          field: 'agent_address'
        },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (trimmedAddress.startsWith('0x') && !isValidEthereumAddress(trimmedAddress)) {
      console.warn('[POST /api/register-agent] Invalid Ethereum address format:', trimmedAddress.substring(0, 10));
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Ethereum address format. Expected 0x followed by 40 hex characters',
          field: 'agent_address'
        },
        { status: 400 }
      );
    }

    // Call backend Python Agent Registry
    const agentApiUrl = process.env.AGENT_API_URL || 'http://localhost:8003';
    const timeout = 10000; // 10 second timeout
    
    console.log(`[POST /api/register-agent] Agent API URL: ${agentApiUrl}`);
    console.log(`[POST /api/register-agent] Registering agent: ${trimmedAddress.substring(0, 10)}...`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${agentApiUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': '0xGuard-Frontend/1.0'
        },
        body: JSON.stringify({ agent_address: trimmedAddress }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`[POST /api/register-agent] Agent API response status: ${response.status}`);

      let data;
      try {
        data = await response.json();
        console.log('[POST /api/register-agent] Agent API response:', {
          success: data.success,
          message: data.message?.substring(0, 50)
        });
      } catch (jsonError) {
        console.error('[POST /api/register-agent] Failed to parse agent API response:', jsonError);
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
        console.error('[POST /api/register-agent] Agent API error:', {
          status: response.status,
          error: data.error,
          message: data.message
        });

        return NextResponse.json(
          {
            success: false,
            error: data.error || data.message || 'Failed to register agent',
            details: data.error ? undefined : data.message,
            statusCode: response.status
          },
          { status: response.status >= 500 ? 502 : response.status }
        );
      }

      const responseTime = Date.now() - startTime;
      console.log(`[POST /api/register-agent] Success (${responseTime}ms)`);

      return NextResponse.json(
        {
          success: true,
          data: data
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
        console.error('[POST /api/register-agent] Agent API timeout:', timeout);
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

      console.error('[POST /api/register-agent] Agent API connection error:', fetchError);
      console.error('[POST /api/register-agent] Error details:', {
        message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        agentApiUrl,
        responseTime: `${responseTime}ms`
      });

      return NextResponse.json(
        {
          success: false,
          error: fetchError instanceof Error ? fetchError.message : 'Failed to connect to agent API',
          message: 'Make sure the agent API server is running on port 8003',
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
    console.error('[POST /api/register-agent] Unexpected error:', error);
    console.error('[POST /api/register-agent] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: `${responseTime}ms`
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to register agent'
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

