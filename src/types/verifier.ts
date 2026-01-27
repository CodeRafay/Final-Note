// Verifier-related types

export enum VerifierStatus {
  INVITED = 'INVITED',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
}

export enum VerificationVote {
  CONFIRM = 'CONFIRM',
  DENY = 'DENY',
}

export interface Verifier {
  id: string;
  switchId: string;
  email: string;
  name: string | null;
  status: VerifierStatus;
  inviteToken: string | null;
  tokenExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVerifierInput {
  email: string;
  name?: string;
}

export interface UpdateVerifierInput {
  name?: string;
  status?: VerifierStatus;
}

export interface VerificationRequest {
  id: string;
  switchId: string;
  startedAt: Date;
  expiresAt: Date;
  requiredConfirmations: number;
  completedAt: Date | null;
  result: 'confirmed' | 'denied' | 'expired' | null;
  createdAt: Date;
}

export interface VerificationVoteRecord {
  id: string;
  verificationRequestId: string;
  verifierId: string;
  vote: VerificationVote;
  votedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface SubmitVoteInput {
  token: string;
  vote: VerificationVote;
  ipAddress?: string;
  userAgent?: string;
}
