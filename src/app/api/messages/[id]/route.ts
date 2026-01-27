// Individual Message API routes
import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { getMessageById, getDecryptedMessage, updateMessage, deleteMessage } from '@/lib/messageManager';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateMessageSchema = z.object({
  content: z.string().min(1).optional(),
  subject: z.string().optional(),
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
    
    const { searchParams } = new URL(request.url);
    const decrypt = searchParams.get('decrypt') === 'true';
    
    if (decrypt) {
      const message = await getDecryptedMessage(id, user.id);
      if (!message) {
        return NextResponse.json(
          { success: false, error: 'Message not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: message,
      });
    }
    
    const message = await getMessageById(id, user.id);
    
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Get message error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get message' },
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
    const parsed = updateMessageSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const message = await updateMessage(id, user.id, parsed.data, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update message' },
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
    
    await deleteMessage(id, user.id, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete message' },
      { status: 400 }
    );
  }
}
