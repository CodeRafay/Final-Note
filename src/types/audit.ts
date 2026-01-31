// Audit log types

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface CreateAuditLogInput {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Entity types for audit logs
export const ENTITY_TYPES = {
  USER: 'user',
  SWITCH: 'switch',
  RECIPIENT: 'recipient',
  MESSAGE: 'message',
  VERIFIER: 'verifier',
  VERIFICATION_REQUEST: 'verification_request',
  VERIFICATION_VOTE: 'verification_vote',
  EMAIL_DELIVERY: 'email_delivery',
  SESSION: 'session',
} as const;

// Actions for audit logs
export const AUDIT_ACTIONS = {
  // User actions
  USER_REGISTERED: 'user_registered',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  USER_PASSWORD_CHANGED: 'user_password_changed',
  USER_PASSWORD_RESET: 'user_password_reset',
  USER_EMAIL_VERIFIED: 'user_email_verified',

  // Switch actions
  SWITCH_CREATED: 'switch_created',
  SWITCH_UPDATED: 'switch_updated',
  SWITCH_DELETED: 'switch_deleted',
  SWITCH_CHECKED_IN: 'switch_checked_in',
  SWITCH_STATUS_CHANGED: 'switch_status_changed',
  SWITCH_PAUSED: 'switch_paused',
  SWITCH_RESUMED: 'switch_resumed',
  SWITCH_CANCELED: 'switch_canceled',
  SWITCH_EXECUTED: 'switch_executed',

  // Recipient actions
  RECIPIENT_ADDED: 'recipient_added',
  RECIPIENT_UPDATED: 'recipient_updated',
  RECIPIENT_REMOVED: 'recipient_removed',

  // Message actions
  MESSAGE_CREATED: 'message_created',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_SENT: 'message_sent',

  // Verifier actions
  VERIFIER_INVITED: 'verifier_invited',
  VERIFIER_NOTIFIED: 'verifier_notified',
  VERIFIER_ACCEPTED: 'verifier_accepted',
  VERIFIER_REVOKED: 'verifier_revoked',

  // Verification actions
  VERIFICATION_STARTED: 'verification_started',
  VERIFICATION_OTP_CREATED: 'verification_otp_created',
  VERIFICATION_OTP_SENT: 'verification_otp_sent',
  VERIFICATION_OTP_VERIFIED: 'verification_otp_verified',
  VERIFICATION_OTP_FAILED: 'verification_otp_failed',
  VERIFICATION_VOTE_SUBMITTED: 'verification_vote_submitted',
  VERIFICATION_COMPLETED: 'verification_completed',
  VERIFICATION_EXPIRED: 'verification_expired',

  // Admin actions
  ADMIN_OVERRIDE: 'admin_override',
  ADMIN_USER_DISABLED: 'admin_user_disabled',
  ADMIN_USER_ENABLED: 'admin_user_enabled',
} as const;
