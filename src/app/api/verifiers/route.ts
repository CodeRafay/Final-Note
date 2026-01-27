// Verifiers API routes
import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { addVerifier, getVerifiersForSwitch } from '@/lib/verificationSystem';
import { z } from 'zod';

const addVerifierSchema = z.object({
  switchId: z.string(),
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
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
    
    const { searchParams } = new URL(request.url);
    const switchId = searchParams.get('switchId');
    
    if (!switchId) {
      return NextResponse.json(
        { success: false, error: 'Switch ID is required' },
        { status: 400 }
      );
    }
    
    const verifiers = await getVerifiersForSwitch(switchId, user.id);
    
    return NextResponse.json({
      success: true,
      data: verifiers,
    });
  } catch (error) {
    console.error('Get verifiers error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get verifiers' },
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
    const parsed = addVerifierSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const verifier = await addVerifier(parsed.data.switchId, user.id, {
      email: parsed.data.email,
      name: parsed.data.name,
    }, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json({
      success: true,
      data: verifier,
    }, { status: 201 });
  } catch (error) {
    console.error('Add verifier error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add verifier' },
      { status: 400 }
    );
  }
}
