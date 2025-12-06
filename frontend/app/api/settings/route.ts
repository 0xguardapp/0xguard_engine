import { NextRequest, NextResponse } from 'next/server';

interface UserSettings {
  notifications: boolean;
  autoRefresh: boolean;
}

// In-memory storage (replace with database in production)
// This should be keyed by user address/wallet
const userSettingsStore: Record<string, UserSettings> = {};

/**
 * GET /api/settings
 * Retrieves user settings
 */
export async function GET(request: NextRequest) {
  try {
    // In production, get user from session/auth
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('address') || 'default';

    console.log('[GET /api/settings] Fetching settings for:', userAddress);

    const settings = userSettingsStore[userAddress] || {
      notifications: true,
      autoRefresh: true,
    };

    return NextResponse.json(
      {
        success: true,
        settings,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[GET /api/settings] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch settings',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * POST /api/settings
 * Updates user settings
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[POST /api/settings] Request received');

  try {
    let body: Partial<UserSettings>;
    
    try {
      body = await request.json();
      console.log('[POST /api/settings] Request body:', body);
    } catch (parseError) {
      console.error('[POST /api/settings] JSON parse error:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          message: parseError instanceof Error ? parseError.message : 'Failed to parse request body',
        },
        {
          status: 400,
        }
      );
    }

    // Input validation
    const validationErrors: string[] = [];

    if (body.notifications !== undefined && typeof body.notifications !== 'boolean') {
      validationErrors.push('notifications must be a boolean');
    }

    if (body.autoRefresh !== undefined && typeof body.autoRefresh !== 'boolean') {
      validationErrors.push('autoRefresh must be a boolean');
    }

    if (validationErrors.length > 0) {
      console.warn('[POST /api/settings] Validation errors:', validationErrors);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          validationErrors,
        },
        {
          status: 400,
        }
      );
    }

    // In production, get user from session/auth
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('address') || 'default';

    // Get existing settings or use defaults
    const existingSettings = userSettingsStore[userAddress] || {
      notifications: true,
      autoRefresh: true,
    };

    // Merge with new settings
    const updatedSettings: UserSettings = {
      notifications: body.notifications !== undefined ? body.notifications : existingSettings.notifications,
      autoRefresh: body.autoRefresh !== undefined ? body.autoRefresh : existingSettings.autoRefresh,
    };

    // Save settings (in production, save to database)
    userSettingsStore[userAddress] = updatedSettings;

    console.log('[POST /api/settings] Settings updated successfully:', {
      userAddress,
      settings: updatedSettings,
      responseTime: `${Date.now() - startTime}ms`,
    });

    return NextResponse.json(
      {
        success: true,
        settings: updatedSettings,
        message: 'Settings saved successfully',
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': `${Date.now() - startTime}ms`,
        },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[POST /api/settings] Error:', error);
    console.error('[POST /api/settings] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: `${responseTime}ms`,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save settings',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      {
        status: 500,
        headers: {
          'X-Response-Time': `${responseTime}ms`,
        },
      }
    );
  }
}

