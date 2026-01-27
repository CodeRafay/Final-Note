// Switch management operations
import { prisma } from './database';
import { createAuditLog } from './audit';
import { transitionSwitchState, checkIn } from './stateMachine';
import { SwitchStatus } from '@/types/switch';
import type { Switch, CreateSwitchInput, UpdateSwitchInput } from '@/types/switch';
import { ENTITY_TYPES, AUDIT_ACTIONS } from '@/types/audit';

/**
 * Create a new switch
 */
export async function createSwitch(
  userId: string,
  input: CreateSwitchInput,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Switch> {
  const nextCheckInDueAt = new Date(
    Date.now() + input.checkInIntervalDays * 24 * 60 * 60 * 1000
  );
  
  const switchData = await prisma.switch.create({
    data: {
      userId,
      name: input.name,
      status: 'ACTIVE',
      checkInIntervalDays: input.checkInIntervalDays,
      gracePeriodDays: input.gracePeriodDays,
      verificationWindowDays: input.verificationWindowDays || 7,
      finalDelayHours: input.finalDelayHours || 24,
      useVerifiers: input.useVerifiers,
      requiredConfirmations: input.requiredConfirmations || 2,
      lastCheckInAt: new Date(),
      nextCheckInDueAt,
    },
  });
  
  // Log creation
  await createAuditLog({
    entityType: ENTITY_TYPES.SWITCH,
    entityId: switchData.id,
    action: AUDIT_ACTIONS.SWITCH_CREATED,
    userId,
    metadata: {
      name: input.name,
      checkInIntervalDays: input.checkInIntervalDays,
      gracePeriodDays: input.gracePeriodDays,
      useVerifiers: input.useVerifiers,
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToSwitch(switchData);
}

/**
 * Update a switch
 */
export async function updateSwitch(
  switchId: string,
  userId: string,
  input: UpdateSwitchInput,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Switch> {
  // Verify ownership
  const existingSwitch = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!existingSwitch || existingSwitch.userId !== userId) {
    throw new Error('Switch not found or access denied');
  }
  
  // Can only update in certain states
  const editableStates = ['ACTIVE', 'OVERDUE', 'PAUSED', 'CANCELED'];
  if (!editableStates.includes(existingSwitch.status)) {
    throw new Error(`Cannot update switch in ${existingSwitch.status} state`);
  }
  
  const updateData: Record<string, unknown> = {};
  
  if (input.name !== undefined) updateData.name = input.name;
  if (input.checkInIntervalDays !== undefined) {
    updateData.checkInIntervalDays = input.checkInIntervalDays;
    // Update next check-in due date if switch is active
    if (existingSwitch.status === 'ACTIVE' && existingSwitch.lastCheckInAt) {
      updateData.nextCheckInDueAt = new Date(
        existingSwitch.lastCheckInAt.getTime() + input.checkInIntervalDays * 24 * 60 * 60 * 1000
      );
    }
  }
  if (input.gracePeriodDays !== undefined) updateData.gracePeriodDays = input.gracePeriodDays;
  if (input.verificationWindowDays !== undefined) updateData.verificationWindowDays = input.verificationWindowDays;
  if (input.finalDelayHours !== undefined) updateData.finalDelayHours = input.finalDelayHours;
  if (input.useVerifiers !== undefined) updateData.useVerifiers = input.useVerifiers;
  if (input.requiredConfirmations !== undefined) updateData.requiredConfirmations = input.requiredConfirmations;
  
  const updatedSwitch = await prisma.switch.update({
    where: { id: switchId },
    data: updateData,
  });
  
  // Log update
  await createAuditLog({
    entityType: ENTITY_TYPES.SWITCH,
    entityId: switchId,
    action: AUDIT_ACTIONS.SWITCH_UPDATED,
    userId,
    metadata: { changes: input },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToSwitch(updatedSwitch);
}

/**
 * Delete a switch
 */
export async function deleteSwitch(
  switchId: string,
  userId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  // Verify ownership
  const existingSwitch = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!existingSwitch || existingSwitch.userId !== userId) {
    throw new Error('Switch not found or access denied');
  }
  
  // Cannot delete an executed switch
  if (existingSwitch.status === 'EXECUTED') {
    throw new Error('Cannot delete an executed switch');
  }
  
  // Log before deletion
  await createAuditLog({
    entityType: ENTITY_TYPES.SWITCH,
    entityId: switchId,
    action: AUDIT_ACTIONS.SWITCH_DELETED,
    userId,
    metadata: { name: existingSwitch.name },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  await prisma.switch.delete({
    where: { id: switchId },
  });
}

/**
 * Get a switch by ID
 */
export async function getSwitchById(switchId: string, userId: string): Promise<Switch | null> {
  const switchData = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!switchData || switchData.userId !== userId) {
    return null;
  }
  
  return mapToSwitch(switchData);
}

/**
 * Get all switches for a user
 */
export async function getSwitchesByUser(
  userId: string,
  options?: {
    status?: SwitchStatus;
    limit?: number;
    offset?: number;
  }
): Promise<Switch[]> {
  const where: Record<string, unknown> = { userId };
  
  if (options?.status) {
    where.status = options.status;
  }
  
  const switches = await prisma.switch.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
  
  return switches.map(mapToSwitch);
}

/**
 * Perform check-in for a switch
 */
export async function performCheckIn(
  switchId: string,
  userId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Switch> {
  // Verify ownership
  const existingSwitch = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!existingSwitch || existingSwitch.userId !== userId) {
    throw new Error('Switch not found or access denied');
  }
  
  const result = await checkIn(switchId, {
    userId,
    ...options,
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Check-in failed');
  }
  
  // Return updated switch
  const updatedSwitch = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  return mapToSwitch(updatedSwitch!);
}

/**
 * Cancel a switch
 */
export async function cancelSwitch(
  switchId: string,
  userId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Switch> {
  // Verify ownership
  const existingSwitch = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!existingSwitch || existingSwitch.userId !== userId) {
    throw new Error('Switch not found or access denied');
  }
  
  const result = await transitionSwitchState(switchId, SwitchStatus.CANCELED, {
    userId,
    ...options,
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Cancel failed');
  }
  
  // Log cancellation
  await createAuditLog({
    entityType: ENTITY_TYPES.SWITCH,
    entityId: switchId,
    action: AUDIT_ACTIONS.SWITCH_CANCELED,
    userId,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  const updatedSwitch = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  return mapToSwitch(updatedSwitch!);
}

/**
 * Pause a switch (admin only)
 */
export async function pauseSwitch(
  switchId: string,
  adminUserId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }
): Promise<Switch> {
  const result = await transitionSwitchState(switchId, SwitchStatus.PAUSED, {
    userId: adminUserId,
    metadata: { reason: options?.reason },
    ...options,
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Pause failed');
  }
  
  // Log pause
  await createAuditLog({
    entityType: ENTITY_TYPES.SWITCH,
    entityId: switchId,
    action: AUDIT_ACTIONS.SWITCH_PAUSED,
    userId: adminUserId,
    metadata: { reason: options?.reason },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  const updatedSwitch = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  return mapToSwitch(updatedSwitch!);
}

/**
 * Resume a paused switch (admin only)
 */
export async function resumeSwitch(
  switchId: string,
  adminUserId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Switch> {
  const result = await transitionSwitchState(switchId, SwitchStatus.ACTIVE, {
    userId: adminUserId,
    ...options,
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Resume failed');
  }
  
  // Log resume
  await createAuditLog({
    entityType: ENTITY_TYPES.SWITCH,
    entityId: switchId,
    action: AUDIT_ACTIONS.SWITCH_RESUMED,
    userId: adminUserId,
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  const updatedSwitch = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  return mapToSwitch(updatedSwitch!);
}

// Helper function to map Prisma result to Switch type
function mapToSwitch(data: {
  id: string;
  userId: string;
  name: string;
  status: string;
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
}): Switch {
  return {
    id: data.id,
    userId: data.userId,
    name: data.name,
    status: data.status as SwitchStatus,
    checkInIntervalDays: data.checkInIntervalDays,
    gracePeriodDays: data.gracePeriodDays,
    verificationWindowDays: data.verificationWindowDays,
    finalDelayHours: data.finalDelayHours,
    useVerifiers: data.useVerifiers,
    requiredConfirmations: data.requiredConfirmations,
    lastCheckInAt: data.lastCheckInAt,
    nextCheckInDueAt: data.nextCheckInDueAt,
    gracePeriodEndsAt: data.gracePeriodEndsAt,
    scheduledExecutionAt: data.scheduledExecutionAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
