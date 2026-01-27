// Messages API routes
import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { createMessage, getMessagesForSwitch } from '@/lib/messageManager';
import { z } from 'zod';

const createMessageSchema = z.object({
  switchId: z.string(),
  recipientId: z.string(),
  content: z.string().min(1, 'Message content is required'),
  subject: z.string().optional(),
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
    
    const messages = await getMessagesForSwitch(switchId, user.id);
    
    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get messages' },
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
    const parsed = createMessageSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const message = await createMessage(parsed.data.switchId, user.id, {
      recipientId: parsed.data.recipientId,
      content: parsed.data.content,
      subject: parsed.data.subject,
    }, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json({
      success: true,
      data: message,
    }, { status: 201 });
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create message' },
      { status: 400 }
    );
  }
}
