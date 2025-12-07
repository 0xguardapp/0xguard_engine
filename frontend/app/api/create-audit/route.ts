import { NextRequest, NextResponse } from 'next/server';
import { CreateAuditRequest } from '@/types';

/**
 * POST /api/create-audit
 * Creates a new audit project
 * 
 * Request body:
 * - name: string (required)
 * - description: string (optional)
 * - target: string (optional) - URL/Repo
 * - targetAddress: string (optional) - Wallet/Contract address
 * - tags: string[] (optional)
 * - difficulty: string (optional)
 * - priority: string (optional)
 * - wallet: string (required) - Wallet address of the creator
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[POST /api/create-audit] Request received');

  try {
    // Parse and validate request body
    let body: CreateAuditRequest;
    try {
      body = await request.json();
      console.log('[POST /api/create-audit] Request body:', {
        name: body.name,
        wallet: body.wallet ? `${body.wallet.substring(0, 10)}...` : 'missing'
      });
    } catch (parseError) {
      console.error('[POST /api/create-audit] JSON parse error:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          message: parseError instanceof Error ? parseError.message : 'Failed to parse request body'
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project name is required',
          field: 'name'
        },
        { status: 400 }
      );
    }

    if (!body.wallet || typeof body.wallet !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet address is required',
          field: 'wallet'
        },
        { status: 400 }
      );
    }

    // Call backend API to create audit
    const agentApiUrl = process.env.AGENT_API_URL || 'http://localhost:8003';
    const timeout = 10000; // 10 second timeout
    
    console.log(`[POST /api/create-audit] Agent API URL: ${agentApiUrl}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${agentApiUrl}/audit/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': '0xGuard-Frontend/1.0'
        },
        body: JSON.stringify({
          name: body.name.trim(),
          description: body.description?.trim(),
          target: body.target?.trim(),
          targetAddress: body.targetAddress?.trim(),
          tags: body.tags,
          difficulty: body.difficulty,
          priority: body.priority,
          wallet: body.wallet.trim()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`[POST /api/create-audit] Agent API response status: ${response.status}`);

      let data;
      try {
        data = await response.json();
        console.log('[POST /api/create-audit] Agent API response:', {
          audit_id: data.audit_id,
          status: data.status
        });
      } catch (jsonError) {
        console.error('[POST /api/create-audit] Failed to parse agent API response:', jsonError);
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
        console.error('[POST /api/create-audit] Agent API error:', {
          status: response.status,
          error: data.error,
          message: data.message
        });

        return NextResponse.json(
          {
            success: false,
            error: data.error || data.message || 'Failed to create audit',
            details: data.error ? undefined : data.message,
            statusCode: response.status
          },
          { status: response.status >= 500 ? 502 : response.status }
        );
      }

      const responseTime = Date.now() - startTime;
      console.log(`[POST /api/create-audit] Success (${responseTime}ms)`);

      return NextResponse.json(
        {
          ...data,
          success: true
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
        console.error('[POST /api/create-audit] Agent API timeout:', timeout);
        return NextResponse.json(
          {
            success: false,
            error: 'Agent API request timeout',
            message: `Request to agent API exceeded ${timeout}ms timeout`
          },
          {
            status: 504,
            headers: {
              'X-Response-Time': `${responseTime}ms`
            }
          }
        );
      }

      console.error('[POST /api/create-audit] Agent API connection error:', fetchError);
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
    console.error('[POST /api/create-audit] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to create audit'
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

