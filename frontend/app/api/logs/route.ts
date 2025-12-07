import { NextRequest, NextResponse } from 'next/server';
import { LogEntry } from '@/types';
import fs from 'fs';
import path from 'path';

/**
 * Read logs from logs.json file
 */
function readLogsFromFile(): LogEntry[] {
  try {
    const logsPath = path.join(process.cwd(), 'logs.json');
    
    if (!fs.existsSync(logsPath)) {
      // Return empty array if file doesn't exist
      return [];
    }
    
    const content = fs.readFileSync(logsPath, 'utf-8');
    if (!content.trim()) {
      return [];
    }
    
    const logs = JSON.parse(content);
    
    // Ensure all logs have required fields and map to LogEntry format
    return logs.map((log: any) => ({
      timestamp: log.timestamp || new Date().toISOString(),
      actor: log.agent || log.actor || 'Unknown',
      icon: log.icon || '🔵',
      message: log.message || '',
      type: log.type || log.category || 'status',
      category: log.category || mapTypeToCategory(log.type || 'status'),
      auditId: log.auditId || log.audit_id,
      is_vulnerability: log.is_vulnerability || false,
    })).filter((log: LogEntry) => log.message); // Filter out invalid entries
    
  } catch (error) {
    console.error('[GET /api/logs] Error reading logs file:', error);
    return [];
  }
}

/**
 * Map log type to category
 */
function mapTypeToCategory(type: string): 'attack' | 'proof' | 'status' | 'error' {
  const typeLower = type.toLowerCase();
  
  if (typeLower.includes('attack') || typeLower.includes('vulnerability') || typeLower.includes('exploit')) {
    return 'attack';
  } else if (typeLower.includes('proof') || typeLower.includes('zk') || typeLower.includes('midnight')) {
    return 'proof';
  } else if (typeLower.includes('error') || typeLower.includes('warning') || typeLower.includes('critical')) {
    return 'error';
  } else {
    return 'status';
  }
}

/**
 * Filter logs based on query parameters
 */
function filterLogs(
  logs: LogEntry[],
  auditId?: string,
  category?: string,
  since?: string,
  limit?: number
): LogEntry[] {
  let filtered = [...logs];
  
  // Filter by auditId
  if (auditId) {
    filtered = filtered.filter(log => 
      log.auditId === auditId || 
      (log as any).audit_id === auditId
    );
  }
  
  // Filter by category
  if (category) {
    const categoryLower = category.toLowerCase();
    filtered = filtered.filter(log => {
      const logCategory = (log as any).category || mapTypeToCategory(log.type);
      return logCategory.toLowerCase() === categoryLower;
    });
  }
  
  // Filter by since timestamp
  if (since) {
    try {
      const sinceDate = new Date(since);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= sinceDate;
      });
    } catch (error) {
      console.warn('[GET /api/logs] Invalid since parameter:', since);
    }
  }
  
  // Sort by timestamp (oldest first)
  filtered.sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateA - dateB;
  });
  
  // Apply limit
  if (limit !== undefined && limit > 0) {
    filtered = filtered.slice(-limit); // Get most recent N logs
  }
  
  return filtered;
}

/**
 * GET /api/logs
 * Retrieves log entries with optional filtering via query parameters
 * 
 * Query parameters:
 * - auditId: Filter by audit ID
 * - category: Filter by category ("attack" | "proof" | "status" | "error")
 * - since: Filter logs since this ISO timestamp
 * - limit: Maximum number of logs to return
 */
export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const auditId = searchParams.get('auditId') || undefined;
    const category = searchParams.get('category') || undefined;
    const since = searchParams.get('since') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    
    // Validate limit
    if (limit !== undefined && (isNaN(limit) || limit < 0)) {
      return NextResponse.json(
        {
          error: 'Invalid limit parameter. Must be a positive integer.',
        },
        { status: 400 }
      );
    }
    
    // Validate category
    if (category && !['attack', 'proof', 'status', 'error'].includes(category.toLowerCase())) {
      return NextResponse.json(
        {
          error: 'Invalid category parameter. Must be one of: attack, proof, status, error',
        },
        { status: 400 }
      );
    }
    
    // Read logs from file
    let logs = readLogsFromFile();
    
    // If no logs found, return empty array (don't generate mock data)
    if (logs.length === 0) {
      return NextResponse.json([], {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
    
    // Apply filters
    logs = filterLogs(logs, auditId, category, since, limit);
    
    return NextResponse.json(logs, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[GET /api/logs] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch logs',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      {
        status: 500,
      }
    );
  }
}
