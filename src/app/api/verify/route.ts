// Verification API routes
import { NextRequest, NextResponse } from 'next/server';
import { submitVerificationVote, acceptVerifierInvitation, verifyOtpAndVote, getVerificationTokenDetails } from '@/lib/verificationSystem';
import { VerificationVote } from '@/types/verifier';
import { z } from 'zod';

const submitVoteSchema = z.object({
  token: z.string(),
  vote: z.enum(['CONFIRM', 'DENY']),
});

const submitOtpVoteSchema = z.object({
  token: z.string(),
  otp: z.string().length(6, 'Verification code must be 6 digits'),
  vote: z.enum(['CONFIRM', 'DENY']),
});

const acceptInviteSchema = z.object({
  token: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }
    
    const tokenDetails = await getVerificationTokenDetails(token);
    
    if (!tokenDetails) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification token' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: tokenDetails,
    });
  } catch (error) {
    console.error('Get verification details error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get verification details' },
      { status: 500 }
    );
  }
}

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
    
    // Check if this is OTP-based verification (has otp field)
    if (body.otp) {
      const parsed = submitOtpVoteSchema.safeParse(body);
      
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0].message },
          { status: 400 }
        );
      }
      
      const result = await verifyOtpAndVote(
        parsed.data.token,
        parsed.data.otp,
        parsed.data.vote as VerificationVote,
        {
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        }
      );
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: {
          result: result.result,
        },
      });
    }
    
    // Default: submit vote (legacy, non-OTP)
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
