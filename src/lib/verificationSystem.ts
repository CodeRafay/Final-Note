// Verification system for switches
import { prisma } from './database';
import { createAuditLog } from './audit';
import { transitionSwitchState } from './stateMachine';
import { generateUrlSafeToken } from './encryption';
import type { Verifier, VerificationRequest, VerificationVoteRecord, CreateVerifierInput, SubmitVoteInput } from '@/types/verifier';
import { VerifierStatus, VerificationVote } from '@/types/verifier';
import { SwitchStatus } from '@/types/switch';
import { ENTITY_TYPES, AUDIT_ACTIONS } from '@/types/audit';

/**
 * Add a verifier to a switch
 */
export async function addVerifier(
  switchId: string,
  userId: string,
  input: CreateVerifierInput,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Verifier> {
  // Verify ownership
  const switchData = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!switchData || switchData.userId !== userId) {
    throw new Error('Switch not found or access denied');
  }
  
  if (!switchData.useVerifiers) {
    throw new Error('This switch does not use verifiers');
  }
  
  // Cannot add verifiers to executed switch
  if (switchData.status === 'EXECUTED') {
    throw new Error('Cannot add verifiers to an executed switch');
  }
  
  // Check if verifier already exists
  const existingVerifier = await prisma.verifier.findFirst({
    where: {
      switchId,
      email: input.email.toLowerCase(),
    },
  });
  
  if (existingVerifier) {
    throw new Error('Verifier with this email already exists for this switch');
  }
  
  // Generate invite token
  const inviteToken = generateUrlSafeToken();
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const verifier = await prisma.verifier.create({
    data: {
      switchId,
      email: input.email.toLowerCase(),
      name: input.name || null,
      status: 'INVITED',
      inviteToken,
      tokenExpiresAt,
    },
  });
  
  // Log addition
  await createAuditLog({
    entityType: ENTITY_TYPES.VERIFIER,
    entityId: verifier.id,
    action: AUDIT_ACTIONS.VERIFIER_INVITED,
    userId,
    metadata: {
      switchId,
      email: input.email.toLowerCase(),
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToVerifier(verifier);
}

/**
 * Revoke a verifier
 */
export async function revokeVerifier(
  verifierId: string,
  userId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Verifier> {
  // Verify ownership
  const verifier = await prisma.verifier.findUnique({
    where: { id: verifierId },
    include: { switch: true },
  });
  
  if (!verifier || verifier.switch.userId !== userId) {
    throw new Error('Verifier not found or access denied');
  }
  
  const updatedVerifier = await prisma.verifier.update({
    where: { id: verifierId },
    data: {
      status: 'REVOKED',
      inviteToken: null,
      tokenExpiresAt: null,
    },
  });
  
  // Log revocation
  await createAuditLog({
    entityType: ENTITY_TYPES.VERIFIER,
    entityId: verifierId,
    action: AUDIT_ACTIONS.VERIFIER_REVOKED,
    userId,
    metadata: {
      switchId: verifier.switchId,
      email: verifier.email,
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToVerifier(updatedVerifier);
}

/**
 * Accept verifier invitation
 */
export async function acceptVerifierInvitation(
  token: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Verifier> {
  const verifier = await prisma.verifier.findUnique({
    where: { inviteToken: token },
  });
  
  if (!verifier) {
    throw new Error('Invalid or expired invitation token');
  }
  
  if (verifier.tokenExpiresAt && verifier.tokenExpiresAt < new Date()) {
    throw new Error('Invitation token has expired');
  }
  
  if (verifier.status === 'REVOKED') {
    throw new Error('This invitation has been revoked');
  }
  
  const updatedVerifier = await prisma.verifier.update({
    where: { id: verifier.id },
    data: {
      status: 'ACCEPTED',
      inviteToken: null,
      tokenExpiresAt: null,
    },
  });
  
  // Log acceptance
  await createAuditLog({
    entityType: ENTITY_TYPES.VERIFIER,
    entityId: verifier.id,
    action: AUDIT_ACTIONS.VERIFIER_ACCEPTED,
    metadata: {
      switchId: verifier.switchId,
      email: verifier.email,
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToVerifier(updatedVerifier);
}

/**
 * Create a verification request for a switch
 */
export async function createVerificationRequest(
  switchId: string,
  options?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<VerificationRequest> {
  const switchData = await prisma.switch.findUnique({
    where: { id: switchId },
    include: {
      verifiers: {
        where: { status: 'ACCEPTED' },
      },
    },
  });
  
  if (!switchData) {
    throw new Error('Switch not found');
  }
  
  if (!switchData.useVerifiers) {
    throw new Error('This switch does not use verifiers');
  }
  
  if (switchData.verifiers.length < switchData.requiredConfirmations) {
    throw new Error(
      `Not enough verified verifiers. Need ${switchData.requiredConfirmations}, have ${switchData.verifiers.length}`
    );
  }
  
  const expiresAt = new Date(
    Date.now() + switchData.verificationWindowDays * 24 * 60 * 60 * 1000
  );
  
  const request = await prisma.verificationRequest.create({
    data: {
      switchId,
      expiresAt,
      requiredConfirmations: switchData.requiredConfirmations,
    },
  });
  
  // Create verification tokens for each verifier
  for (const verifier of switchData.verifiers) {
    await prisma.verificationToken.create({
      data: {
        verificationRequestId: request.id,
        verifierId: verifier.id,
        token: generateUrlSafeToken(),
        expiresAt,
      },
    });
  }
  
  // Transition switch to pending verification
  await transitionSwitchState(switchId, SwitchStatus.PENDING_VERIFICATION, options);
  
  // Log creation
  await createAuditLog({
    entityType: ENTITY_TYPES.VERIFICATION_REQUEST,
    entityId: request.id,
    action: AUDIT_ACTIONS.VERIFICATION_STARTED,
    userId: options?.userId,
    metadata: {
      switchId,
      verifierCount: switchData.verifiers.length,
      requiredConfirmations: switchData.requiredConfirmations,
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToVerificationRequest(request);
}

/**
 * Submit a verification vote
 */
export async function submitVerificationVote(
  input: SubmitVoteInput,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ vote: VerificationVoteRecord; result: 'pending' | 'confirmed' | 'denied' }> {
  // Find the verification token
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token: input.token },
    include: {
      verificationRequest: {
        include: {
          switch: true,
          votes: true,
        },
      },
      verifier: true,
    },
  });
  
  if (!verificationToken) {
    throw new Error('Invalid verification token');
  }
  
  if (verificationToken.expiresAt < new Date()) {
    throw new Error('Verification token has expired');
  }
  
  if (verificationToken.usedAt) {
    throw new Error('This token has already been used');
  }
  
  const { verificationRequest, verifier } = verificationToken;
  
  if (verificationRequest.completedAt) {
    throw new Error('This verification request has already been completed');
  }
  
  // Check if verifier has already voted
  const existingVote = await prisma.verificationVoteRecord.findUnique({
    where: {
      verificationRequestId_verifierId: {
        verificationRequestId: verificationRequest.id,
        verifierId: verifier.id,
      },
    },
  });
  
  if (existingVote) {
    throw new Error('You have already submitted a vote for this verification');
  }
  
  // Use a transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Mark token as used
    await tx.verificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });
    
    // Create vote
    const vote = await tx.verificationVoteRecord.create({
      data: {
        verificationRequestId: verificationRequest.id,
        verifierId: verifier.id,
        vote: input.vote,
        ipAddress: options?.ipAddress || null,
        userAgent: options?.userAgent || null,
      },
    });
    
    // Log vote
    await tx.auditLog.create({
      data: {
        entityType: ENTITY_TYPES.VERIFICATION_VOTE,
        entityId: vote.id,
        action: AUDIT_ACTIONS.VERIFICATION_VOTE_SUBMITTED,
        metadata: {
          verificationRequestId: verificationRequest.id,
          verifierId: verifier.id,
          vote: input.vote,
        },
        ipAddress: options?.ipAddress || null,
        userAgent: options?.userAgent || null,
      },
    });
    
    // If vote is DENY, immediately cancel verification
    if (input.vote === VerificationVote.DENY) {
      await tx.verificationRequest.update({
        where: { id: verificationRequest.id },
        data: {
          completedAt: new Date(),
          result: 'denied',
        },
      });
      
      // Reset switch to active
      await tx.switch.update({
        where: { id: verificationRequest.switchId },
        data: {
          status: 'ACTIVE',
          lastCheckInAt: new Date(),
          nextCheckInDueAt: new Date(
            Date.now() + verificationRequest.switch.checkInIntervalDays * 24 * 60 * 60 * 1000
          ),
          gracePeriodEndsAt: null,
          scheduledExecutionAt: null,
        },
      });
      
      return { vote: mapToVoteRecord(vote), result: 'denied' as const };
    }
    
    // Count confirmation votes
    const confirmVotes = await tx.verificationVoteRecord.count({
      where: {
        verificationRequestId: verificationRequest.id,
        vote: 'CONFIRM',
      },
    });
    
    // Check if quorum reached
    if (confirmVotes >= verificationRequest.requiredConfirmations) {
      await tx.verificationRequest.update({
        where: { id: verificationRequest.id },
        data: {
          completedAt: new Date(),
          result: 'confirmed',
        },
      });
      
      // Transition switch to verified
      await tx.switch.update({
        where: { id: verificationRequest.switchId },
        data: {
          status: 'VERIFIED',
          scheduledExecutionAt: new Date(
            Date.now() + verificationRequest.switch.finalDelayHours * 60 * 60 * 1000
          ),
        },
      });
      
      return { vote: mapToVoteRecord(vote), result: 'confirmed' as const };
    }
    
    return { vote: mapToVoteRecord(vote), result: 'pending' as const };
  });
  
  return result;
}

/**
 * Get verifiers for a switch
 */
export async function getVerifiersForSwitch(
  switchId: string,
  userId: string
): Promise<Verifier[]> {
  const switchData = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!switchData || switchData.userId !== userId) {
    throw new Error('Switch not found or access denied');
  }
  
  const verifiers = await prisma.verifier.findMany({
    where: { switchId },
    orderBy: { createdAt: 'asc' },
  });
  
  return verifiers.map(mapToVerifier);
}

/**
 * Get active verification request for a switch
 */
export async function getActiveVerificationRequest(
  switchId: string
): Promise<VerificationRequest | null> {
  const request = await prisma.verificationRequest.findFirst({
    where: {
      switchId,
      completedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { startedAt: 'desc' },
  });
  
  return request ? mapToVerificationRequest(request) : null;
}

// Helper functions
function mapToVerifier(data: {
  id: string;
  switchId: string;
  email: string;
  name: string | null;
  status: string;
  inviteToken: string | null;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Verifier {
  return {
    id: data.id,
    switchId: data.switchId,
    email: data.email,
    name: data.name,
    status: data.status as VerifierStatus,
    inviteToken: data.inviteToken,
    tokenExpiresAt: data.tokenExpiresAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function mapToVerificationRequest(data: {
  id: string;
  switchId: string;
  startedAt: Date;
  expiresAt: Date;
  requiredConfirmations: number;
  completedAt: Date | null;
  result: string | null;
  createdAt: Date;
}): VerificationRequest {
  return {
    id: data.id,
    switchId: data.switchId,
    startedAt: data.startedAt,
    expiresAt: data.expiresAt,
    requiredConfirmations: data.requiredConfirmations,
    completedAt: data.completedAt,
    result: data.result as 'confirmed' | 'denied' | 'expired' | null,
    createdAt: data.createdAt,
  };
}

function mapToVoteRecord(data: {
  id: string;
  verificationRequestId: string;
  verifierId: string;
  vote: string;
  votedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}): VerificationVoteRecord {
  return {
    id: data.id,
    verificationRequestId: data.verificationRequestId,
    verifierId: data.verifierId,
    vote: data.vote as VerificationVote,
    votedAt: data.votedAt,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  };
}
