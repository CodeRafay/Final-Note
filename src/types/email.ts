// Email-related types

export enum EmailDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface EmailDelivery {
  id: string;
  messageId: string;
  provider: string;
  status: EmailDeliveryStatus;
  providerResponse: Record<string, unknown> | null;
  providerMessageId: string | null;
  attemptedAt: Date | null;
  sentAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: Date;
}

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export type EmailType =
  | 'check_in_reminder'
  | 'grace_period_warning'
  | 'verification_request'
  | 'final_message'
  | 'system_notification';
