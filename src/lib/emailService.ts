// Email service using Nodemailer with Gmail SMTP
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from './database';
import { createAuditLog } from './audit';
import type { SendEmailInput } from '@/types/email';
import { ENTITY_TYPES, AUDIT_ACTIONS } from '@/types/audit';

let transporter: Transporter | null = null;

/**
 * Get or create the Nodemailer transporter configured for Gmail SMTP
 */
function getTransporter(): Transporter {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_PASS;
    
    if (!user || !pass) {
      throw new Error('GMAIL_USER and GMAIL_PASS must be configured');
    }
    
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Use SSL
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

function getFromEmail(): string {
  return process.env.GMAIL_USER || 'noreply@example.com';
}

function getFromName(): string {
  return process.env.GMAIL_FROM_NAME || 'Final Note';
}

/**
 * Send a transactional email
 */
export async function sendEmail(input: SendEmailInput): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const transport = getTransporter();
    
    const mailOptions = {
      from: `"${getFromName()}" <${getFromEmail()}>`,
      to: input.toName ? `"${input.toName}" <${input.to}>` : input.to,
      subject: input.subject,
      html: input.htmlContent,
      text: input.textContent,
    };
    
    const result = await transport.sendMail(mailOptions);
    
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Email sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send final message to recipient (with idempotency)
 */
export async function sendFinalMessage(
  messageId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ success: boolean; deliveryId: string }> {
  // Check for existing successful delivery (idempotency)
  const existingDelivery = await prisma.emailDelivery.findFirst({
    where: {
      messageId,
      status: 'SENT',
    },
  });
  
  if (existingDelivery) {
    // Already sent successfully
    return { success: true, deliveryId: existingDelivery.id };
  }
  
  // Get message with recipient
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { recipient: true },
  });
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  // Import decrypt function here to avoid circular dependency
  const { decrypt } = await import('./encryption');
  
  // Decrypt message content
  const content = decrypt(message.encryptedContent);
  
  // Create delivery record first
  const delivery = await prisma.emailDelivery.create({
    data: {
      messageId,
      provider: 'nodemailer',
      status: 'PENDING',
    },
  });
  
  try {
    // Send the email
    const result = await sendEmail({
      to: message.recipient.email,
      toName: message.recipient.name || undefined,
      subject: message.subject || 'A Final Note for You',
      htmlContent: wrapInEmailTemplate(content, message.recipient.name),
      textContent: content,
    });
    
    if (result.success) {
      // Update delivery as successful
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'SENT',
          providerMessageId: result.messageId,
          sentAt: new Date(),
          attemptedAt: new Date(),
        },
      });
      
      // Log success
      await createAuditLog({
        entityType: ENTITY_TYPES.EMAIL_DELIVERY,
        entityId: delivery.id,
        action: AUDIT_ACTIONS.MESSAGE_SENT,
        metadata: {
          messageId,
          recipientEmail: message.recipient.email,
          providerMessageId: result.messageId,
        },
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });
      
      return { success: true, deliveryId: delivery.id };
    } else {
      // Update delivery as failed
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          errorMessage: result.error,
          failedAt: new Date(),
          attemptedAt: new Date(),
          retryCount: { increment: 1 },
        },
      });
      
      return { success: false, deliveryId: delivery.id };
    }
  } catch (error) {
    // Update delivery as failed
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date(),
        attemptedAt: new Date(),
        retryCount: { increment: 1 },
      },
    });
    
    return { success: false, deliveryId: delivery.id };
  }
}

/**
 * Send check-in reminder email
 */
export async function sendCheckInReminder(
  userEmail: string,
  userName: string | null,
  switchName: string,
  checkInUrl: string
): Promise<boolean> {
  const result = await sendEmail({
    to: userEmail,
    toName: userName || undefined,
    subject: `Check-in reminder for "${switchName}" - Final Note`,
    htmlContent: getCheckInReminderTemplate(userName, switchName, checkInUrl),
    textContent: `Hi ${userName || 'there'},\n\nThis is a reminder to check in for your switch "${switchName}".\n\nClick here to check in: ${checkInUrl}\n\nIf you don't check in, your switch will enter the grace period.\n\n- Final Note`,
  });
  
  return result.success;
}

/**
 * Send grace period warning email
 */
export async function sendGracePeriodWarning(
  userEmail: string,
  userName: string | null,
  switchName: string,
  checkInUrl: string,
  gracePeriodEndsAt: Date
): Promise<boolean> {
  const result = await sendEmail({
    to: userEmail,
    toName: userName || undefined,
    subject: `⚠️ URGENT: Grace period active for "${switchName}" - Final Note`,
    htmlContent: getGracePeriodWarningTemplate(userName, switchName, checkInUrl, gracePeriodEndsAt),
    textContent: `URGENT: Hi ${userName || 'there'},\n\nYour switch "${switchName}" has entered the grace period!\n\nGrace period ends: ${gracePeriodEndsAt.toISOString()}\n\nPlease check in immediately: ${checkInUrl}\n\nIf you don't check in before the grace period ends, your final messages will be sent.\n\n- Final Note`,
  });
  
  return result.success;
}

/**
 * Send verification request email
 */
export async function sendVerificationRequest(
  verifierEmail: string,
  verifierName: string | null,
  ownerName: string,
  verifyUrl: string,
  expiresAt: Date
): Promise<boolean> {
  const result = await sendEmail({
    to: verifierEmail,
    toName: verifierName || undefined,
    subject: `Verification request from ${ownerName} - Final Note`,
    htmlContent: getVerificationRequestTemplate(verifierName, ownerName, verifyUrl, expiresAt),
    textContent: `Hi ${verifierName || 'there'},\n\nYou have been asked to verify the status of ${ownerName}.\n\nPlease use this secure link to submit your verification: ${verifyUrl}\n\nThis link expires on ${expiresAt.toISOString()}\n\nImportant: Only confirm if you have verified that ${ownerName} is deceased or permanently incapacitated.\n\n- Final Note`,
  });
  
  return result.success;
}

// Email template functions

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

function wrapInEmailTemplate(content: string, recipientName: string | null): string {
  const escapedContent = escapeHtml(content);
  const escapedName = recipientName ? escapeHtml(recipientName) : 'Friend';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A Final Note for You</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .message { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #1a1a2e; margin: 20px 0; white-space: pre-wrap; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Final Note</h1>
  </div>
  <div class="content">
    <p>Dear ${escapedName},</p>
    <p>Someone special wanted you to receive this message:</p>
    <div class="message">${escapedContent.replace(/\n/g, '<br>')}</div>
  </div>
  <div class="footer">
    <p>This message was sent via Final Note - A secure dead man's switch service.</p>
  </div>
</body>
</html>
`;
}

function getCheckInReminderTemplate(
  userName: string | null,
  switchName: string,
  checkInUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Final Note</h1>
  </div>
  <div class="content">
    <p>Hi ${userName || 'there'},</p>
    <p>This is a friendly reminder to check in for your switch <strong>"${switchName}"</strong>.</p>
    <p style="text-align: center;">
      <a href="${checkInUrl}" class="btn">Check In Now</a>
    </p>
    <p>If you don't check in, your switch will enter the grace period.</p>
  </div>
  <div class="footer">
    <p>Final Note - Secure Dead Man's Switch</p>
  </div>
</body>
</html>
`;
}

function getGracePeriodWarningTemplate(
  userName: string | null,
  switchName: string,
  checkInUrl: string,
  gracePeriodEndsAt: Date
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #d32f2f; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #fff3f3; padding: 30px; border-radius: 0 0 8px 8px; border: 2px solid #d32f2f; }
    .warning { background: #ffebee; border: 1px solid #d32f2f; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .btn { display: inline-block; background: #d32f2f; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚠️ URGENT: Grace Period Active</h1>
  </div>
  <div class="content">
    <p>Hi ${userName || 'there'},</p>
    <div class="warning">
      <strong>Your switch "${switchName}" has entered the grace period!</strong>
    </div>
    <p><strong>Grace period ends:</strong> ${gracePeriodEndsAt.toLocaleString()}</p>
    <p>If you don't check in before this time, your final messages will be sent to your recipients.</p>
    <p style="text-align: center;">
      <a href="${checkInUrl}" class="btn">CHECK IN NOW</a>
    </p>
  </div>
  <div class="footer">
    <p>Final Note - Secure Dead Man's Switch</p>
  </div>
</body>
</html>
`;
}

function getVerificationRequestTemplate(
  verifierName: string | null,
  ownerName: string,
  verifyUrl: string,
  expiresAt: Date
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .important { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .btn { display: inline-block; background: #1a1a2e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Verification Request</h1>
  </div>
  <div class="content">
    <p>Dear ${verifierName || 'Verifier'},</p>
    <p>You have been designated as a trusted verifier by <strong>${ownerName}</strong> for their Final Note dead man's switch.</p>
    <p>This person has not checked in for an extended period, and verification is now required.</p>
    <div class="important">
      <strong>Important:</strong> Only confirm that ${ownerName} is deceased or permanently incapacitated if you have independently verified this information.
    </div>
    <p><strong>Verification expires:</strong> ${expiresAt.toLocaleString()}</p>
    <p style="text-align: center;">
      <a href="${verifyUrl}" class="btn">Submit Verification</a>
    </p>
    <p>If you cannot verify or are unsure, you may choose to deny verification, which will reset the switch and allow the user to check in again.</p>
  </div>
  <div class="footer">
    <p>Final Note - Secure Dead Man's Switch</p>
  </div>
</body>
</html>
`;
}
