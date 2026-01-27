// Background job scheduler for cron tasks
import { prisma } from './database';
import { createAuditLog } from './audit';
import { transitionSwitchState } from './stateMachine';
import { createVerificationRequest } from './verificationSystem';
import { sendCheckInReminder, sendGracePeriodWarning, sendVerificationRequest, sendFinalMessage } from './emailService';
import { generateUrlSafeToken } from './encryption';
import { SwitchStatus } from '@/types/switch';
import { ENTITY_TYPES, AUDIT_ACTIONS } from '@/types/audit';

/**
 * Verify the cron secret to ensure authorized access
 */
export function verifyCronSecret(secret: string): boolean {
  return secret === process.env.CRON_SECRET;
}

/**
 * Job: Detect and process overdue switches
 * Runs periodically to find switches that are past their check-in due date
 */
export async function processOverdueSwitches(): Promise<{
  processed: number;
  transitioned: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let transitioned = 0;
  
  // Find active switches that are overdue
  const overdueSwitches = await prisma.switch.findMany({
    where: {
      status: 'ACTIVE',
      nextCheckInDueAt: {
        lt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });
  
  for (const sw of overdueSwitches) {
    try {
      // Transition to OVERDUE
      const result = await transitionSwitchState(sw.id, SwitchStatus.OVERDUE);
      
      if (result.success) {
        transitioned++;
        
        // Send reminder email
        const checkInToken = await createCheckInToken(sw.id);
        const checkInUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkin/${checkInToken}`;
        
        await sendCheckInReminder(
          sw.user.email,
          sw.user.name,
          sw.name,
          checkInUrl
        );
      } else {
        errors.push(`Failed to transition switch ${sw.id}: ${result.error}`);
      }
    } catch (error) {
      errors.push(`Error processing switch ${sw.id}: ${error}`);
    }
  }
  
  return {
    processed: overdueSwitches.length,
    transitioned,
    errors,
  };
}

/**
 * Job: Transition overdue switches to grace period
 * After a configurable delay, move overdue switches to grace period
 */
export async function processGracePeriodTransitions(): Promise<{
  processed: number;
  transitioned: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let transitioned = 0;
  
  // Find overdue switches (we'll transition immediately for simplicity)
  // In a more complex system, you might wait a certain time after becoming overdue
  const overdueSwitches = await prisma.switch.findMany({
    where: {
      status: 'OVERDUE',
    },
    include: {
      user: true,
    },
  });
  
  for (const sw of overdueSwitches) {
    try {
      // Transition to GRACE_PERIOD
      const result = await transitionSwitchState(sw.id, SwitchStatus.GRACE_PERIOD);
      
      if (result.success) {
        transitioned++;
        
        // Get updated switch to get grace period end date
        const updatedSwitch = await prisma.switch.findUnique({
          where: { id: sw.id },
        });
        
        if (updatedSwitch?.gracePeriodEndsAt) {
          // Send grace period warning email
          const checkInToken = await createCheckInToken(sw.id);
          const checkInUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkin/${checkInToken}`;
          
          await sendGracePeriodWarning(
            sw.user.email,
            sw.user.name,
            sw.name,
            checkInUrl,
            updatedSwitch.gracePeriodEndsAt
          );
        }
      } else {
        errors.push(`Failed to transition switch ${sw.id}: ${result.error}`);
      }
    } catch (error) {
      errors.push(`Error processing switch ${sw.id}: ${error}`);
    }
  }
  
  return {
    processed: overdueSwitches.length,
    transitioned,
    errors,
  };
}

/**
 * Job: Process grace period expiry
 * When grace period ends, either trigger verification or direct execution
 */
export async function processGracePeriodExpiry(): Promise<{
  processed: number;
  transitioned: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let transitioned = 0;
  
  // Find switches in grace period that have expired
  const expiredSwitches = await prisma.switch.findMany({
    where: {
      status: 'GRACE_PERIOD',
      gracePeriodEndsAt: {
        lt: new Date(),
      },
    },
    include: {
      user: true,
      verifiers: {
        where: { status: 'ACCEPTED' },
      },
    },
  });
  
  for (const sw of expiredSwitches) {
    try {
      if (sw.useVerifiers && sw.verifiers.length >= sw.requiredConfirmations) {
        // Create verification request and transition to PENDING_VERIFICATION
        const verificationRequest = await createVerificationRequest(sw.id);
        
        // Send verification request emails to all verifiers
        for (const verifier of sw.verifiers) {
          const verificationToken = await prisma.verificationToken.findFirst({
            where: {
              verificationRequestId: verificationRequest.id,
              verifierId: verifier.id,
            },
          });
          
          if (verificationToken) {
            const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${verificationToken.token}`;
            await sendVerificationRequest(
              verifier.email,
              verifier.name,
              sw.user.name || sw.user.email,
              verifyUrl,
              verificationRequest.expiresAt
            );
          }
        }
        
        transitioned++;
      } else {
        // No verifiers - transition directly to VERIFIED (skip verification)
        const result = await transitionSwitchState(sw.id, SwitchStatus.VERIFIED);
        
        if (result.success) {
          transitioned++;
        } else {
          errors.push(`Failed to transition switch ${sw.id}: ${result.error}`);
        }
      }
    } catch (error) {
      errors.push(`Error processing switch ${sw.id}: ${error}`);
    }
  }
  
  return {
    processed: expiredSwitches.length,
    transitioned,
    errors,
  };
}

/**
 * Job: Handle verification expiry
 * When verification window expires without quorum, expire the request
 */
export async function processVerificationExpiry(): Promise<{
  processed: number;
  expired: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let expired = 0;
  
  // Find expired verification requests
  const expiredRequests = await prisma.verificationRequest.findMany({
    where: {
      completedAt: null,
      expiresAt: {
        lt: new Date(),
      },
    },
    include: {
      switch: true,
    },
  });
  
  for (const request of expiredRequests) {
    try {
      await prisma.$transaction(async (tx) => {
        // Mark request as expired
        await tx.verificationRequest.update({
          where: { id: request.id },
          data: {
            completedAt: new Date(),
            result: 'expired',
          },
        });
        
        // Keep switch in pending verification - admin will need to intervene
        // Or we could reset to active - for safety, we'll leave it paused
        await tx.switch.update({
          where: { id: request.switchId },
          data: {
            status: 'PAUSED',
          },
        });
        
        // Log expiry
        await tx.auditLog.create({
          data: {
            entityType: ENTITY_TYPES.VERIFICATION_REQUEST,
            entityId: request.id,
            action: AUDIT_ACTIONS.VERIFICATION_EXPIRED,
            metadata: {
              switchId: request.switchId,
              reason: 'Verification window expired without quorum',
            },
          },
        });
      });
      
      expired++;
    } catch (error) {
      errors.push(`Error expiring request ${request.id}: ${error}`);
    }
  }
  
  return {
    processed: expiredRequests.length,
    expired,
    errors,
  };
}

/**
 * Job: Execute verified switches
 * Send final messages for switches that have passed the final delay
 */
export async function executeVerifiedSwitches(): Promise<{
  processed: number;
  executed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let executed = 0;
  
  // Find verified switches ready for execution
  const readyForExecution = await prisma.switch.findMany({
    where: {
      status: 'VERIFIED',
      scheduledExecutionAt: {
        lt: new Date(),
      },
    },
    include: {
      recipients: {
        include: {
          message: true,
        },
      },
    },
  });
  
  for (const sw of readyForExecution) {
    try {
      let allSent = true;
      
      // Send all messages
      for (const recipient of sw.recipients) {
        if (recipient.message) {
          const result = await sendFinalMessage(recipient.message.id);
          if (!result.success) {
            allSent = false;
            errors.push(`Failed to send message ${recipient.message.id} for switch ${sw.id}`);
          }
        }
      }
      
      // Even with partial failures, mark as executed to prevent duplicate sends
      const transitionResult = await transitionSwitchState(sw.id, SwitchStatus.EXECUTED);
      
      if (transitionResult.success) {
        executed++;
        
        // Log execution
        await createAuditLog({
          entityType: ENTITY_TYPES.SWITCH,
          entityId: sw.id,
          action: AUDIT_ACTIONS.SWITCH_EXECUTED,
          metadata: {
            messageCount: sw.recipients.filter(r => r.message).length,
            allSent,
          },
        });
      } else {
        errors.push(`Failed to mark switch ${sw.id} as executed: ${transitionResult.error}`);
      }
    } catch (error) {
      errors.push(`Error executing switch ${sw.id}: ${error}`);
    }
  }
  
  return {
    processed: readyForExecution.length,
    executed,
    errors,
  };
}

/**
 * Job: Send check-in reminders
 * Send reminders to users whose check-in is due soon
 */
export async function sendCheckInReminders(): Promise<{
  sent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sent = 0;
  
  // Find active switches due for check-in in the next 24 hours
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  const upcomingSwitches = await prisma.switch.findMany({
    where: {
      status: 'ACTIVE',
      nextCheckInDueAt: {
        gt: new Date(),
        lt: soon,
      },
    },
    include: {
      user: true,
    },
  });
  
  for (const sw of upcomingSwitches) {
    try {
      const checkInToken = await createCheckInToken(sw.id);
      const checkInUrl = `${process.env.NEXT_PUBLIC_APP_URL}/checkin/${checkInToken}`;
      
      const success = await sendCheckInReminder(
        sw.user.email,
        sw.user.name,
        sw.name,
        checkInUrl
      );
      
      if (success) {
        sent++;
      } else {
        errors.push(`Failed to send reminder for switch ${sw.id}`);
      }
    } catch (error) {
      errors.push(`Error sending reminder for switch ${sw.id}: ${error}`);
    }
  }
  
  return { sent, errors };
}

/**
 * Create a check-in token for a switch
 */
async function createCheckInToken(switchId: string): Promise<string> {
  const token = generateUrlSafeToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await prisma.checkInToken.create({
    data: {
      switchId,
      token,
      expiresAt,
    },
  });
  
  return token;
}

/**
 * Verify and use a check-in token
 */
export async function verifyAndUseCheckInToken(token: string): Promise<string | null> {
  const checkInToken = await prisma.checkInToken.findUnique({
    where: { token },
  });
  
  if (!checkInToken) {
    return null;
  }
  
  if (checkInToken.expiresAt < new Date()) {
    return null;
  }
  
  if (checkInToken.usedAt) {
    // Already used - but still return switchId for the check-in to be idempotent
    return checkInToken.switchId;
  }
  
  // Mark as used
  await prisma.checkInToken.update({
    where: { id: checkInToken.id },
    data: { usedAt: new Date() },
  });
  
  return checkInToken.switchId;
}

/**
 * Run all scheduled jobs
 */
export async function runAllJobs(): Promise<{
  overdue: Awaited<ReturnType<typeof processOverdueSwitches>>;
  gracePeriod: Awaited<ReturnType<typeof processGracePeriodTransitions>>;
  gracePeriodExpiry: Awaited<ReturnType<typeof processGracePeriodExpiry>>;
  verificationExpiry: Awaited<ReturnType<typeof processVerificationExpiry>>;
  execution: Awaited<ReturnType<typeof executeVerifiedSwitches>>;
  reminders: Awaited<ReturnType<typeof sendCheckInReminders>>;
}> {
  const overdue = await processOverdueSwitches();
  const gracePeriod = await processGracePeriodTransitions();
  const gracePeriodExpiry = await processGracePeriodExpiry();
  const verificationExpiry = await processVerificationExpiry();
  const execution = await executeVerifiedSwitches();
  const reminders = await sendCheckInReminders();
  
  return {
    overdue,
    gracePeriod,
    gracePeriodExpiry,
    verificationExpiry,
    execution,
    reminders,
  };
}
