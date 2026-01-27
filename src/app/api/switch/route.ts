// Switch API routes
import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createSwitch, getSwitchesByUser } from '@/lib/switchManager';
import { z } from 'zod';

const createSwitchSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  checkInIntervalDays: z.number().min(1).max(365),
  gracePeriodDays: z.number().min(1).max(30),
  verificationWindowDays: z.number().min(1).max(30).optional(),
  finalDelayHours: z.number().min(1).max(168).optional(),
  useVerifiers: z.boolean(),
  requiredConfirmations: z.number().min(1).max(10).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const user = await validateSession(token);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    const switches = await getSwitchesByUser(user.id);
    
    return NextResponse.json({
      success: true,
      data: switches,
    });
  } catch (error) {
    console.error('Get switches error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get switches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const user = await validateSession(token);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const parsed = createSwitchSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const switchData = await createSwitch(user.id, parsed.data, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json({
      success: true,
      data: switchData,
    }, { status: 201 });
  } catch (error) {
    console.error('Create switch error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create switch' },
      { status: 400 }
    );
  }
}
