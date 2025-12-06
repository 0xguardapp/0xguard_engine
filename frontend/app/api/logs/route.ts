import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import { getRedisClient, isRedisAvailable } from '@/lib/redis';

/**
 * Validates log entry structure
 */
function isValidLogEntry(log: any): boolean {
  return (
    typeof log === 'object' &&
    log !== null &&
    typeof log.timestamp === 'string' &&
    typeof log.actor === 'string' &&
    typeof log.message === 'string' &&
    typeof log.type === 'string'
  );
}

/**
 * GET /api/logs
 * Retrieves audit logs from logs.json file
 * 
 * Query parameters:
 * - limit: Maximum number of log entries (default: 1000, max: 10000)
 * - since: Only return logs after this timestamp (ISO string)
 * - type: Filter by log type
 * - actor: Filter by actor name
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log('[GET /api/logs] Request received');
  
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const sinceParam = searchParams.get('since');
    const typeFilter = searchParams.get('type');
    const actorFilter = searchParams.get('actor');
    const auditIdFilter = searchParams.get('audit_id');
    
    console.log('[GET /api/logs] Query params:', { 
      limit: limitParam, 
      since: sinceParam ? sinceParam.substring(0, 20) : null,
      type: typeFilter,
      actor: actorFilter,
      audit_id: auditIdFilter
    });

    // Validate limit parameter
    let limit = 1000; // Default limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 10000) {
        console.warn('[GET /api/logs] Invalid limit:', limitParam);
        return NextResponse.json(
          {
            error: 'Invalid limit parameter',
            message: 'Limit must be between 1 and 10000',
            received: limitParam
          },
          { status: 400 }
        );
      }
      limit = parsedLimit;
    }

    // Validate since parameter (ISO timestamp)
    let sinceTimestamp: number | null = null;
    if (sinceParam) {
      try {
        const parsedDate = new Date(sinceParam);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date format');
        }
        sinceTimestamp = parsedDate.getTime();
        console.log('[GET /api/logs] Filtering logs since:', sinceParam);
      } catch (dateError) {
        console.warn('[GET /api/logs] Invalid since parameter:', sinceParam);
        return NextResponse.json(
          {
            error: 'Invalid since parameter',
            message: 'Since must be a valid ISO 8601 timestamp',
            received: sinceParam
          },
          { status: 400 }
        );
      }
    }

    // Try Redis first (preferred method)
    let logs: any[] = [];
    let useRedis = false;
    
    try {
      if (await isRedisAvailable()) {
        useRedis = true;
        const client = await getRedisClient();
        if (client) {
          // Determine Redis key based on audit_id filter
          const key = auditIdFilter ? `logs:audit:${auditIdFilter}` : 'logs:global';
          
          // Get logs from Redis
          const logsJson = await client.lRange(key, 0, limit - 1);
          
          // Parse JSON entries (reverse to get newest first)
          for (const logJson of logsJson.reverse()) {
            try {
              const logEntry = JSON.parse(logJson);
              logs.push(logEntry);
            } catch (parseError) {
              console.warn('[GET /api/logs] Failed to parse log entry from Redis:', parseError);
            }
          }
          
          console.log(`[GET /api/logs] Retrieved ${logs.length} logs from Redis (key: ${key})`);
        }
      }
    } catch (redisError) {
      console.warn('[GET /api/logs] Redis error, falling back to file:', redisError);
      useRedis = false;
    }
    
    // Fallback to file-based logging if Redis is not available
    if (!useRedis) {
      // Read logs.json from project root (one level up from frontend)
      const logsPath = join(process.cwd(), '..', 'logs.json');
      console.log('[GET /api/logs] Reading logs from file:', logsPath);

      // Check if file exists and is readable
      try {
        await access(logsPath, constants.F_OK | constants.R_OK);
      } catch (accessError) {
        console.log('[GET /api/logs] Logs file does not exist or is not readable, returning empty array');
        return NextResponse.json(
          {
            logs: [],
            total: 0,
            message: 'Logs file not found or not accessible'
          },
          {
            status: 200,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Response-Time': `${Date.now() - startTime}ms`
            },
          }
        );
      }

      // Read and parse logs file
      let fileContents: string;
      try {
        fileContents = await readFile(logsPath, 'utf-8');
        console.log('[GET /api/logs] File read successfully, size:', fileContents.length, 'bytes');
      } catch (readError) {
        console.error('[GET /api/logs] Error reading logs file:', readError);
        return NextResponse.json(
          {
            error: 'Failed to read logs file',
            message: readError instanceof Error ? readError.message : 'Unknown error'
          },
          {
            status: 500,
            headers: {
              'X-Response-Time': `${Date.now() - startTime}ms`
            }
          }
        );
      }

      // Parse JSON
      try {
        const parsed = JSON.parse(fileContents);
        // Ensure it's an array
        logs = Array.isArray(parsed) ? parsed : [];
        console.log('[GET /api/logs] Parsed', logs.length, 'log entries from file');
      } catch (parseError) {
        console.error('[GET /api/logs] JSON parse error:', parseError);
        return NextResponse.json(
          {
            error: 'Failed to parse logs file',
            message: parseError instanceof Error ? parseError.message : 'Invalid JSON format'
          },
          {
            status: 500,
            headers: {
              'X-Response-Time': `${Date.now() - startTime}ms`
            }
          }
        );
      }
    }

    // Validate and filter log entries
    let validLogs = logs.filter(log => {
      if (!isValidLogEntry(log)) {
        console.warn('[GET /api/logs] Invalid log entry found:', log);
        return false;
      }
      return true;
    });

    console.log('[GET /api/logs] Valid log entries:', validLogs.length);

    // Apply filters
    if (sinceTimestamp !== null) {
      const beforeCount = validLogs.length;
      validLogs = validLogs.filter(log => {
        try {
          const logTime = new Date(log.timestamp).getTime();
          return !isNaN(logTime) && logTime >= sinceTimestamp!;
        } catch {
          return false;
        }
      });
      console.log(`[GET /api/logs] Filtered by timestamp: ${beforeCount} -> ${validLogs.length}`);
    }

    if (typeFilter) {
      const beforeCount = validLogs.length;
      validLogs = validLogs.filter(log => log.type === typeFilter);
      console.log(`[GET /api/logs] Filtered by type "${typeFilter}": ${beforeCount} -> ${validLogs.length}`);
    }

    if (actorFilter) {
      const beforeCount = validLogs.length;
      validLogs = validLogs.filter(log => 
        log.actor.toLowerCase().includes(actorFilter.toLowerCase())
      );
      console.log(`[GET /api/logs] Filtered by actor "${actorFilter}": ${beforeCount} -> ${validLogs.length}`);
    }

    // Filter by audit_id if provided (only needed when reading from file or global Redis key)
    if (auditIdFilter && !useRedis) {
      const beforeCount = validLogs.length;
      validLogs = validLogs.filter(log => 
        log.audit_id === auditIdFilter
      );
      console.log(`[GET /api/logs] Filtered by audit_id "${auditIdFilter}": ${beforeCount} -> ${validLogs.length}`);
    }

    // Apply limit (get most recent logs)
    const totalCount = validLogs.length;
    const limitedLogs = validLogs.slice(-limit);
    
    console.log(`[GET /api/logs] Returning ${limitedLogs.length} logs (total: ${totalCount}, limit: ${limit})`);

    const responseTime = Date.now() - startTime;
    console.log(`[GET /api/logs] Success (${responseTime}ms)`);

    return NextResponse.json(
      {
        logs: limitedLogs,
        total: totalCount,
        returned: limitedLogs.length,
        hasMore: totalCount > limit
      },
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
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[GET /api/logs] Unexpected error:', error);
    console.error('[GET /api/logs] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: `${responseTime}ms`
    });

    // Return empty array on error (graceful degradation)
    return NextResponse.json(
      {
        logs: [],
        total: 0,
        error: 'Failed to fetch logs',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Response-Time': `${responseTime}ms`
        },
      }
    );
  }
}

