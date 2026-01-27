// Switch-related types

export enum SwitchStatus {
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  GRACE_PERIOD = 'GRACE_PERIOD',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  EXECUTED = 'EXECUTED',
  CANCELED = 'CANCELED',
  PAUSED = 'PAUSED',
}

export interface Switch {
  id: string;
  userId: string;
  name: string;
  status: SwitchStatus;
  checkInIntervalDays: number;
  gracePeriodDays: number;
  verificationWindowDays: number;
  finalDelayHours: number;
  useVerifiers: boolean;
  requiredConfirmations: number;
  lastCheckInAt: Date | null;
  nextCheckInDueAt: Date | null;
  gracePeriodEndsAt: Date | null;
  scheduledExecutionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSwitchInput {
  name: string;
  checkInIntervalDays: number;
  gracePeriodDays: number;
  verificationWindowDays?: number;
  finalDelayHours?: number;
  useVerifiers: boolean;
  requiredConfirmations?: number;
}

export interface UpdateSwitchInput {
  name?: string;
  checkInIntervalDays?: number;
  gracePeriodDays?: number;
  verificationWindowDays?: number;
  finalDelayHours?: number;
  useVerifiers?: boolean;
  requiredConfirmations?: number;
}

// Valid state transitions
export const VALID_TRANSITIONS: Record<SwitchStatus, SwitchStatus[]> = {
  [SwitchStatus.ACTIVE]: [SwitchStatus.OVERDUE, SwitchStatus.CANCELED, SwitchStatus.PAUSED],
  [SwitchStatus.OVERDUE]: [SwitchStatus.GRACE_PERIOD, SwitchStatus.ACTIVE, SwitchStatus.CANCELED, SwitchStatus.PAUSED],
  [SwitchStatus.GRACE_PERIOD]: [SwitchStatus.PENDING_VERIFICATION, SwitchStatus.ACTIVE, SwitchStatus.CANCELED, SwitchStatus.PAUSED, SwitchStatus.VERIFIED],
  [SwitchStatus.PENDING_VERIFICATION]: [SwitchStatus.VERIFIED, SwitchStatus.ACTIVE, SwitchStatus.CANCELED, SwitchStatus.PAUSED],
  [SwitchStatus.VERIFIED]: [SwitchStatus.EXECUTED, SwitchStatus.ACTIVE, SwitchStatus.CANCELED, SwitchStatus.PAUSED],
  [SwitchStatus.EXECUTED]: [], // Terminal state - no transitions allowed
  [SwitchStatus.CANCELED]: [SwitchStatus.ACTIVE], // Can be reactivated
  [SwitchStatus.PAUSED]: [SwitchStatus.ACTIVE, SwitchStatus.CANCELED],
};

export function isValidTransition(from: SwitchStatus, to: SwitchStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
