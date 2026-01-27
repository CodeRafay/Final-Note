// System status API route
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(_request: NextRequest) {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get some basic stats
    const [userCount, switchCount] = await Promise.all([
      prisma.user.count(),
      prisma.switch.count(),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        version: process.env.npm_package_version || '0.1.0',
        stats: {
          users: userCount,
          switches: switchCount,
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        success: false,
        data: {
          status: 'unhealthy',
          database: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }
}
