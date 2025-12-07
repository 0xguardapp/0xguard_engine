import { NextRequest, NextResponse } from 'next/server';

/**
 * Default agent status structure
 */
const defaultAgentStatus = {
  judge: { is_running: false, health_status: 'down' },
  target: { is_running: false, health_status: 'down' },
  red_team: { is_running: false, health_status: 'down' },
};

/**
 * GET /api/agent-status
 * Retrieves status of all agents (Judge, Target, Red Team)
 * 
 * Returns status information including:
 * - is_running: boolean
 * - port: number
 * - address: string
 * - health_status: 'healthy' | 'degraded' | 'down'
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[GET /api/agent-status] Request received');

  try {
    const agentApiUrl = process.env.AGENT_API_URL || 'http://localhost:8003';
    const timeout = 5000; // 5 second timeout for status check
    
    console.log('[GET /api/agent-status] Agent API URL:', agentApiUrl);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${agentApiUrl}/api/agents/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': '0xGuard-Frontend/1.0'
        },
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[GET /api/agent-status] Agent API response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}` };
        }

        console.error('[GET /api/agent-status] Agent API error:', {
          status: response.status,
          error: errorData.error || errorData.message
        });

        // Return default status with error information
        return NextResponse.json(
          {
            ...defaultAgentStatus,
            error: errorData.error || 'Failed to fetch agent status',
            statusCode: response.status,
            message: errorData.message
          },
          {
            status: response.status >= 500 ? 502 : response.status,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Response-Time': `${Date.now() - startTime}ms`
            },
          }
        );
      }

      let data;
      try {
        data = await response.json();
        console.log('[GET /api/agent-status] Agent status retrieved:', {
          judge: data.judge?.health_status || 'unknown',
          target: data.target?.health_status || 'unknown',
          red_team: data.red_team?.health_status || 'unknown'
        });
      } catch (jsonError) {
        console.error('[GET /api/agent-status] Failed to parse agent API response:', jsonError);
        return NextResponse.json(
          {
            ...defaultAgentStatus,
            error: 'Invalid response from agent API',
            message: 'Agent API returned invalid JSON'
          },
          {
            status: 502,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-Response-Time': `${Date.now() - startTime}ms`
            }
          }
        );
      }

      // Validate response structure
      const hasValidStructure = 
        data &&
        typeof data === 'object' &&
        (data.judge || data.target || data.red_team);

      if (!hasValidStructure) {
        console.warn('[GET /api/agent-status] Invalid response structure:', data);
        return NextResponse.json(
          {
            ...defaultAgentStatus,
            error: 'Invalid response structure from agent API',
            received: data
          },
          {
            status: 502,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-Response-Time': `${Date.now() - startTime}ms`
            }
          }
        );
      }

      const responseTime = Date.now() - startTime;
      console.log(`[GET /api/agent-status] Success (${responseTime}ms)`);

      // Transform backend response to frontend format
      // Backend returns: { target: bool, judge: bool, red_team: bool, ports: { target: int, judge: int, red_team: int } }
      // Frontend expects: { judge: { is_running: bool, port: int, ... }, ... }
      const transformedData = {
        judge: {
          is_running: data.judge ?? false,
          health_status: data.judge ? 'healthy' : 'down',
          port: data.ports?.judge ?? 8002,
        },
        target: {
          is_running: data.target ?? false,
          health_status: data.target ? 'healthy' : 'down',
          port: data.ports?.target ?? 8000,
        },
        red_team: {
          is_running: data.red_team ?? false,
          health_status: data.red_team ? 'healthy' : 'down',
          port: data.ports?.red_team ?? 8001,
        },
        started_at: data.started_at,
      };

      return NextResponse.json(
        transformedData,
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Response-Time': `${responseTime}ms`
          },
        }
      );
    } catch (fetchError) {
      const responseTime = Date.now() - startTime;

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[GET /api/agent-status] Agent API timeout:', timeout);
        return NextResponse.json(
          {
            ...defaultAgentStatus,
            error: 'Agent API request timeout',
            message: `Request to agent API exceeded ${timeout}ms timeout`
          },
          {
            status: 504,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'X-Response-Time': `${responseTime}ms`
            }
          }
        );
      }

      console.error('[GET /api/agent-status] Agent API connection error:', fetchError);
      console.error('[GET /api/agent-status] Error details:', {
        message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        agentApiUrl,
        responseTime: `${responseTime}ms`
      });

      return NextResponse.json(
        {
          ...defaultAgentStatus,
          error: 'Failed to connect to agent API',
          message: fetchError instanceof Error
            ? fetchError.message
            : 'Make sure the agent API server is running on port 8003',
          agentApiUrl
        },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Response-Time': `${responseTime}ms`
          }
        }
      );
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[GET /api/agent-status] Unexpected error:', error);
    console.error('[GET /api/agent-status] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: `${responseTime}ms`
    });

    return NextResponse.json(
      {
        ...defaultAgentStatus,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch agent status'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Response-Time': `${responseTime}ms`
        }
      }
    );
  }
}

