// Auth API routes - Logout
import { NextRequest, NextResponse } from 'next/server';
import { logoutUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import { jwtVerify } from 'jose';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    
    if (token) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      try {
        const { payload } = await jwtVerify(token, secret);
        if (payload.sessionId && payload.userId) {
          await logoutUser(
            payload.sessionId as string,
            payload.userId as string
          );
        }
      } catch {
        // Token invalid, just clear cookie
      }
    }
    
    const response = NextResponse.json({ success: true });
    
    // Clear the session cookie
    response.cookies.delete(SESSION_COOKIE_NAME);
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Even on error, clear the cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}
