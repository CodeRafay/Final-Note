// Verification API routes
import { NextRequest, NextResponse } from 'next/server';
import { submitVerificationVote, acceptVerifierInvitation } from '@/lib/verificationSystem';
import { VerificationVote } from '@/types/verifier';
import { z } from 'zod';

const submitVoteSchema = z.object({
  token: z.string(),
  vote: z.enum(['CONFIRM', 'DENY']),
});

const acceptInviteSchema = z.object({
  token: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'accept-invite') {
      const parsed = acceptInviteSchema.safeParse(body);
      
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid token' },
          { status: 400 }
        );
      }
      
      const verifier = await acceptVerifierInvitation(parsed.data.token, {
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
      
      return NextResponse.json({
        success: true,
        data: verifier,
      });
    }
    
    // Default: submit vote
    const parsed = submitVoteSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }
    
    const result = await submitVerificationVote({
      token: parsed.data.token,
      vote: parsed.data.vote as VerificationVote,
    }, {
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        vote: result.vote,
        result: result.result,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 400 }
    );
  }
}
