// Check-in API route
import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { performCheckIn } from '@/lib/switchManager';
import { verifyAndUseCheckInToken } from '@/lib/scheduler';
import { checkIn } from '@/lib/stateMachine';
import { z } from 'zod';

const checkInSchema = z.object({
  switchId: z.string().optional(),
  token: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      );
    }
    
    const { switchId, token } = parsed.data;
    
    // Check-in via token (from email link)
    if (token) {
      const tokenSwitchId = await verifyAndUseCheckInToken(token);
      
      if (!tokenSwitchId) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired check-in token' },
          { status: 400 }
        );
      }
      
      const result = await checkIn(tokenSwitchId, {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: 'Check-in successful',
      });
    }
    
    // Check-in via authenticated session
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const user = await validateSession(sessionToken);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    if (!switchId) {
      return NextResponse.json(
        { success: false, error: 'Switch ID is required' },
        { status: 400 }
      );
    }
    
    const switchData = await performCheckIn(switchId, user.id, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json({
      success: true,
      data: switchData,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Check-in failed' },
      { status: 400 }
    );
  }
}
