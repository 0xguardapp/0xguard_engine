import { NextRequest, NextResponse } from 'next/server';
import { Audit } from '@/types';

// Mock audit data - in production, this would fetch from a database
const mockAudits: Audit[] = [
  {
    id: 'audit_1',
    targetAddress: '0x8a3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d',
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    vulnerabilityCount: 3,
    riskScore: 85,
    intensity: 'deep',
  },
  {
    id: 'audit_2',
    targetAddress: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    status: 'completed',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago
    vulnerabilityCount: 7,
    riskScore: 92,
    intensity: 'deep',
  },
  {
    id: 'audit_3',
    targetAddress: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
    status: 'completed',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 3 days ago + 2 hours
    vulnerabilityCount: 2,
    riskScore: 45,
    intensity: 'quick',
  },
  {
    id: 'audit_4',
    targetAddress: '0x5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d',
    status: 'active',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    vulnerabilityCount: 1,
    riskScore: 78,
    intensity: 'quick',
  },
  {
    id: 'audit_5',
    targetAddress: '0x3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    status: 'failed',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(), // 11 hours ago
    vulnerabilityCount: 0,
    riskScore: 0,
    intensity: 'deep',
  },
  {
    id: 'audit_6',
    targetAddress: '0x7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
    status: 'completed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // 5 days ago + 4 hours
    vulnerabilityCount: 12,
    riskScore: 98,
    intensity: 'deep',
  },
  {
    id: 'audit_7',
    targetAddress: '0x2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f',
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    vulnerabilityCount: 0,
    riskScore: undefined,
    intensity: 'quick',
  },
  {
    id: 'audit_8',
    targetAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    status: 'completed',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(), // 7 days ago + 6 hours
    vulnerabilityCount: 15,
    riskScore: 95,
    intensity: 'deep',
  },
  {
    id: 'audit_9',
    targetAddress: '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2',
    status: 'completed',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), // 10 days ago + 8 hours
    vulnerabilityCount: 5,
    riskScore: 67,
    intensity: 'quick',
  },
  {
    id: 'audit_10',
    targetAddress: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
    status: 'active',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    vulnerabilityCount: 2,
    riskScore: 72,
    intensity: 'deep',
  },
  {
    id: 'audit_11',
    targetAddress: '0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabAB',
    status: 'completed',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(), // 14 days ago + 5 hours
    vulnerabilityCount: 8,
    riskScore: 88,
    intensity: 'deep',
  },
  {
    id: 'audit_12',
    targetAddress: '0x617F2E2fD72FD9D5503197092aC168c91465E7f2',
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), // 2 days ago + 3 hours
    vulnerabilityCount: 4,
    riskScore: 56,
    intensity: 'quick',
  },
];

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


