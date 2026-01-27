// Cron job API route
import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret, runAllJobs } from '@/lib/scheduler';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const secret = authHeader?.replace('Bearer ', '');
    
    if (!secret || !verifyCronSecret(secret)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Run all scheduled jobs
    const results = await runAllJobs();
    
    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { success: false, error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

// Vercel Cron Jobs also send POST requests
export async function POST(request: NextRequest) {
  return GET(request);
}
