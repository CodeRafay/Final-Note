// State machine for switch lifecycle
import { prisma } from './database';
import { SwitchStatus, VALID_TRANSITIONS, isValidTransition } from '@/types/switch';
import { ENTITY_TYPES, AUDIT_ACTIONS } from '@/types/audit';

export interface StateTransitionResult {
  success: boolean;
  previousStatus: SwitchStatus;
  newStatus: SwitchStatus;
  error?: string;
}

/**
 * Transition a switch to a new state
 * All transitions are transactional and logged
 */
export async function transitionSwitchState(
  switchId: string,
  newStatus: SwitchStatus,
  options?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<StateTransitionResult> {
  // Use a transaction to ensure atomicity
  return prisma.$transaction(async (tx) => {
    // Get current switch state with lock
    const currentSwitch = await tx.switch.findUnique({
      where: { id: switchId },
    });
    
    if (!currentSwitch) {
      return {
        success: false,
        previousStatus: SwitchStatus.ACTIVE,
        newStatus,
        error: 'Switch not found',
      };
    }
    
    const previousStatus = currentSwitch.status as SwitchStatus;
    
    // Validate transition
    if (!isValidTransition(previousStatus, newStatus)) {
      return {
        success: false,
        previousStatus,
        newStatus,
        error: `Invalid transition from ${previousStatus} to ${newStatus}`,
      };
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };
    
    // Handle specific transitions
    switch (newStatus) {
      case SwitchStatus.ACTIVE:
        // Reset timers when becoming active
        updateData.lastCheckInAt = new Date();
        updateData.nextCheckInDueAt = new Date(
          Date.now() + currentSwitch.checkInIntervalDays * 24 * 60 * 60 * 1000
        );
        updateData.gracePeriodEndsAt = null;
        updateData.scheduledExecutionAt = null;
        break;
        
      case SwitchStatus.GRACE_PERIOD:
        // Set grace period end date
        updateData.gracePeriodEndsAt = new Date(
          Date.now() + currentSwitch.gracePeriodDays * 24 * 60 * 60 * 1000
        );
        break;
        
      case SwitchStatus.VERIFIED:
        // Set scheduled execution time (final delay)
        updateData.scheduledExecutionAt = new Date(
          Date.now() + currentSwitch.finalDelayHours * 60 * 60 * 1000
        );
        break;
        
      case SwitchStatus.EXECUTED:
      case SwitchStatus.CANCELED:
        // Clear all timers
        updateData.nextCheckInDueAt = null;
        updateData.gracePeriodEndsAt = null;
        updateData.scheduledExecutionAt = null;
        break;
    }
    
    // Update the switch
    await tx.switch.update({
      where: { id: switchId },
      data: updateData,
    });
    
    // Log the transition
    await tx.auditLog.create({
      data: {
        entityType: ENTITY_TYPES.SWITCH,
        entityId: switchId,
        action: AUDIT_ACTIONS.SWITCH_STATUS_CHANGED,
        userId: options?.userId || null,
        metadata: {
          previousStatus,
          newStatus,
          ...options?.metadata,
        },
        ipAddress: options?.ipAddress || null,
        userAgent: options?.userAgent || null,
      },
    });
    
    return {
      success: true,
      previousStatus,
      newStatus,
    };
  });
}

/**
 * Check in for a switch - resets to ACTIVE state
 */
export async function checkIn(
  switchId: string,
  options?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<StateTransitionResult> {
  return prisma.$transaction(async (tx) => {
    const currentSwitch = await tx.switch.findUnique({
      where: { id: switchId },
    });
    
    if (!currentSwitch) {
      return {
        success: false,
        previousStatus: SwitchStatus.ACTIVE,
        newStatus: SwitchStatus.ACTIVE,
        error: 'Switch not found',
      };
    }
    
    const previousStatus = currentSwitch.status as SwitchStatus;
    
    // Check-in is only valid from certain states
    const validCheckInStates = [
      SwitchStatus.ACTIVE,
      SwitchStatus.OVERDUE,
      SwitchStatus.GRACE_PERIOD,
      SwitchStatus.PENDING_VERIFICATION,
      SwitchStatus.VERIFIED,
    ];
    
    if (!validCheckInStates.includes(previousStatus)) {
      return {
        success: false,
        previousStatus,
        newStatus: SwitchStatus.ACTIVE,
        error: `Cannot check in from ${previousStatus} state`,
      };
    }
    
    // Update the switch
    const nextCheckInDueAt = new Date(
      Date.now() + currentSwitch.checkInIntervalDays * 24 * 60 * 60 * 1000
    );
    
    await tx.switch.update({
      where: { id: switchId },
      data: {
        status: 'ACTIVE',
        lastCheckInAt: new Date(),
        nextCheckInDueAt,
        gracePeriodEndsAt: null,
        scheduledExecutionAt: null,
      },
    });
    
    // Cancel any pending verification requests
    await tx.verificationRequest.updateMany({
      where: {
        switchId,
        completedAt: null,
      },
      data: {
        completedAt: new Date(),
        result: 'denied',
      },
    });
    
    // Log the check-in
    await tx.auditLog.create({
      data: {
        entityType: ENTITY_TYPES.SWITCH,
        entityId: switchId,
        action: AUDIT_ACTIONS.SWITCH_CHECKED_IN,
        userId: options?.userId || null,
        metadata: {
          previousStatus,
          newStatus: SwitchStatus.ACTIVE,
        },
        ipAddress: options?.ipAddress || null,
        userAgent: options?.userAgent || null,
      },
    });
    
    return {
      success: true,
      previousStatus,
      newStatus: SwitchStatus.ACTIVE,
    };
  });
}

/**
 * Get the current status of a switch
 */
export async function getSwitchStatus(switchId: string): Promise<SwitchStatus | null> {
  const switchData = await prisma.switch.findUnique({
    where: { id: switchId },
    select: { status: true },
  });
  
  return switchData?.status as SwitchStatus | null;
}

/**
 * Get valid next states for a switch
 */
export function getValidNextStates(currentStatus: SwitchStatus): SwitchStatus[] {
  return VALID_TRANSITIONS[currentStatus] || [];
}
