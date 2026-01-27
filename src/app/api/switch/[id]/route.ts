// Individual Switch API routes
import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getSwitchById, updateSwitch, deleteSwitch } from '@/lib/switchManager';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateSwitchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  checkInIntervalDays: z.number().min(1).max(365).optional(),
  gracePeriodDays: z.number().min(1).max(30).optional(),
  verificationWindowDays: z.number().min(1).max(30).optional(),
  finalDelayHours: z.number().min(1).max(168).optional(),
  useVerifiers: z.boolean().optional(),
  requiredConfirmations: z.number().min(1).max(10).optional(),
});

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
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
    
    const switchData = await getSwitchById(id, user.id);
    
    if (!switchData) {
      return NextResponse.json(
        { success: false, error: 'Switch not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: switchData,
    });
  } catch (error) {
    console.error('Get switch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get switch' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
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
    const parsed = updateSwitchSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const switchData = await updateSwitch(id, user.id, parsed.data, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json({
      success: true,
      data: switchData,
    });
  } catch (error) {
    console.error('Update switch error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update switch' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
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
    
    await deleteSwitch(id, user.id, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete switch error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete switch' },
      { status: 400 }
    );
  }
}
