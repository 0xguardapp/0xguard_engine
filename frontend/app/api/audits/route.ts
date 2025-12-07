import { NextRequest, NextResponse } from 'next/server';
import { Audit } from '@/types';

// Audit data - in production, this would fetch from a database
// Currently empty - audits will be populated when real audits are created
const mockAudits: Audit[] = [];

/**
 * GET /api/audits
 * Retrieves all audits
 * 
 * Query parameters:
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
    const statusFilter = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    console.log('[GET /api/audits] Query params:', { statusFilter, limitParam, offsetParam });
    
    // Input validation
    const validStatuses = ['active', 'completed', 'failed'];
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
    
    // Filter audits by status if provided
    let filteredAudits = mockAudits;
    if (statusFilter) {
      filteredAudits = mockAudits.filter(audit => audit.status === statusFilter);
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


