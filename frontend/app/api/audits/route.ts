import { NextRequest, NextResponse } from 'next/server';
import { Audit } from '@/types';

// Audit data - in production, this would fetch from a database
// Currently empty - audits will be populated when real audits are created
const mockAudits: Audit[] = [];

// Helper function to convert backend audit format to frontend Audit format
function convertBackendAuditToFrontend(backendAudit: any): Audit {
  return {
    id: backendAudit.get('audit_id') || backendAudit.get('id') || '',
    name: backendAudit.get('name'),
    description: backendAudit.get('description'),
    targetAddress: backendAudit.get('targetAddress') || backendAudit.get('target') || '',
    target: backendAudit.get('target'),
    status: (backendAudit.get('status') || 'pending') as Audit['status'],
    createdAt: backendAudit.get('created_at') || backendAudit.get('createdAt') || new Date().toISOString(),
    updatedAt: backendAudit.get('updated_at') || backendAudit.get('updatedAt') || new Date().toISOString(),
    vulnerabilityCount: backendAudit.get('vulnerabilityCount'),
    riskScore: backendAudit.get('riskScore'),
    intensity: backendAudit.get('intensity'),
    ownerAddress: backendAudit.get('wallet') || backendAudit.get('ownerAddress'),
    tags: backendAudit.get('tags'),
    difficulty: backendAudit.get('difficulty'),
    priority: backendAudit.get('priority'),
    metadata: backendAudit.get('metadata'),
  };
}

/**
 * GET /api/audits
 * Retrieves all audits, optionally filtered by owner wallet address
 * 
 * Query parameters:
 * - owner: Filter by owner wallet address
 * - status: Filter by status (active|completed|failed)
 * - limit: Maximum number of results (default: 100)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[GET /api/audits] Request received');
  
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const ownerFilter = searchParams.get('owner');
    const statusFilter = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    console.log('[GET /api/audits] Query params:', { ownerFilter, statusFilter, limitParam, offsetParam });
    
    // Input validation
    const validStatuses = ['active', 'completed', 'failed', 'pending', 'ready'];
    if (statusFilter && !validStatuses.includes(statusFilter)) {
      console.warn('[GET /api/audits] Invalid status filter:', statusFilter);
      return NextResponse.json(
        { 
          error: 'Invalid status filter',
          validStatuses,
          received: statusFilter
        },
        { status: 400 }
      );
    }
    
    // Validate and parse limit
    let limit = 100; // Default limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
        console.warn('[GET /api/audits] Invalid limit:', limitParam);
        return NextResponse.json(
          { error: 'Invalid limit parameter. Must be between 1 and 1000' },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }
    
    // Validate and parse offset
    let offset = 0; // Default offset
    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        console.warn('[GET /api/audits] Invalid offset:', offsetParam);
        return NextResponse.json(
          { error: 'Invalid offset parameter. Must be >= 0' },
          { status: 400 }
        );
      }
      offset = parsedOffset;
    }
    
    // Fetch audits from backend
    let allAudits = [...mockAudits];
    try {
      const agentApiUrl = process.env.AGENT_API_URL || 'http://localhost:8003';
      const params = new URLSearchParams();
      if (ownerFilter) {
        params.append('owner', ownerFilter);
      }
      if (statusFilter) {
        params.append('status', statusFilter);
      }
      
      const queryString = params.toString();
      const backendUrl = `${agentApiUrl}/audits${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      if (response.ok) {
        const backendData = await response.json();
        if (backendData.audits && Array.isArray(backendData.audits)) {
          // Backend already returns in frontend format
          allAudits = backendData.audits as Audit[];
          console.log(`[GET /api/audits] Fetched ${allAudits.length} audits from backend`);
        }
      }
    } catch (error) {
      console.warn('[GET /api/audits] Could not fetch from backend, using local storage:', error);
      // Fallback to mockAudits if backend is unavailable
    }
    
    // Filter audits by owner address if provided
    let filteredAudits = allAudits;
    if (ownerFilter) {
      filteredAudits = allAudits.filter(audit => 
        audit.ownerAddress && audit.ownerAddress.toLowerCase() === ownerFilter.toLowerCase()
      );
      console.log(`[GET /api/audits] Filtered by owner "${ownerFilter}": ${filteredAudits.length} audits`);
    }
    
    // Filter audits by status if provided
    if (statusFilter) {
      filteredAudits = filteredAudits.filter(audit => audit.status === statusFilter);
      console.log(`[GET /api/audits] Filtered by status "${statusFilter}": ${filteredAudits.length} audits`);
    }
    
    // Apply pagination
    const paginatedAudits = filteredAudits.slice(offset, offset + limit);
    const totalCount = filteredAudits.length;
    
    console.log(`[GET /api/audits] Returning ${paginatedAudits.length} audits (total: ${totalCount}, offset: ${offset}, limit: ${limit})`);
    
    const responseTime = Date.now() - startTime;
    console.log(`[GET /api/audits] Success (${responseTime}ms)`);
    
    return NextResponse.json(
      {
        audits: paginatedAudits,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${responseTime}ms`
        }
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[GET /api/audits] Error:', error);
    console.error('[GET /api/audits] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: `${responseTime}ms`
    });
    
    return NextResponse.json(
      {
        error: 'Failed to fetch audits',
        message: error instanceof Error ? error.message : 'Internal server error'
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


