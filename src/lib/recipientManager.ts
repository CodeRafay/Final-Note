// Recipient management operations
import { prisma } from './database';
import { createAuditLog } from './audit';
import type { Recipient, CreateRecipientInput, UpdateRecipientInput } from '@/types/recipient';
import { ENTITY_TYPES, AUDIT_ACTIONS } from '@/types/audit';

/**
 * Add a recipient to a switch
 */
export async function addRecipient(
  switchId: string,
  userId: string,
  input: CreateRecipientInput,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Recipient> {
  // Verify ownership
  const switchData = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!switchData || switchData.userId !== userId) {
    throw new Error('Switch not found or access denied');
  }
  
  // Cannot add recipients to executed switch
  if (switchData.status === 'EXECUTED') {
    throw new Error('Cannot add recipients to an executed switch');
  }
  
  // Check if recipient already exists for this switch
  const existingRecipient = await prisma.recipient.findFirst({
    where: {
      switchId,
      email: input.email.toLowerCase(),
    },
  });
  
  if (existingRecipient) {
    throw new Error('Recipient with this email already exists for this switch');
  }
  
  const recipient = await prisma.recipient.create({
    data: {
      switchId,
      email: input.email.toLowerCase(),
      name: input.name || null,
    },
  });
  
  // Log addition
  await createAuditLog({
    entityType: ENTITY_TYPES.RECIPIENT,
    entityId: recipient.id,
    action: AUDIT_ACTIONS.RECIPIENT_ADDED,
    userId,
    metadata: {
      switchId,
      email: input.email.toLowerCase(),
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToRecipient(recipient);
}

/**
 * Update a recipient
 */
export async function updateRecipient(
  recipientId: string,
  userId: string,
  input: UpdateRecipientInput,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Recipient> {
  // Verify ownership
  const recipient = await prisma.recipient.findUnique({
    where: { id: recipientId },
    include: { switch: true },
  });
  
  if (!recipient || recipient.switch.userId !== userId) {
    throw new Error('Recipient not found or access denied');
  }
  
  // Cannot update recipients of executed switch
  if (recipient.switch.status === 'EXECUTED') {
    throw new Error('Cannot update recipients of an executed switch');
  }
  
  const updateData: Record<string, unknown> = {};
  
  if (input.email !== undefined) {
    // Check if new email already exists for this switch
    const existingRecipient = await prisma.recipient.findFirst({
      where: {
        switchId: recipient.switchId,
        email: input.email.toLowerCase(),
        id: { not: recipientId },
      },
    });
    
    if (existingRecipient) {
      throw new Error('Recipient with this email already exists for this switch');
    }
    
    updateData.email = input.email.toLowerCase();
  }
  
  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  
  const updatedRecipient = await prisma.recipient.update({
    where: { id: recipientId },
    data: updateData,
  });
  
  // Log update
  await createAuditLog({
    entityType: ENTITY_TYPES.RECIPIENT,
    entityId: recipientId,
    action: AUDIT_ACTIONS.RECIPIENT_UPDATED,
    userId,
    metadata: { changes: input },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToRecipient(updatedRecipient);
}

/**
 * Remove a recipient
 */
export async function removeRecipient(
  recipientId: string,
  userId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  // Verify ownership
  const recipient = await prisma.recipient.findUnique({
    where: { id: recipientId },
    include: { switch: true },
  });
  
  if (!recipient || recipient.switch.userId !== userId) {
    throw new Error('Recipient not found or access denied');
  }
  
  // Cannot remove recipients from executed switch
  if (recipient.switch.status === 'EXECUTED') {
    throw new Error('Cannot remove recipients from an executed switch');
  }
  
  // Log before deletion
  await createAuditLog({
    entityType: ENTITY_TYPES.RECIPIENT,
    entityId: recipientId,
    action: AUDIT_ACTIONS.RECIPIENT_REMOVED,
    userId,
    metadata: {
      switchId: recipient.switchId,
      email: recipient.email,
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  // Delete recipient (cascades to message)
  await prisma.recipient.delete({
    where: { id: recipientId },
  });
}

/**
 * Get a recipient by ID
 */
export async function getRecipientById(recipientId: string, userId: string): Promise<Recipient | null> {
  const recipient = await prisma.recipient.findUnique({
    where: { id: recipientId },
    include: { switch: true },
  });
  
  if (!recipient || recipient.switch.userId !== userId) {
    return null;
  }
  
  return mapToRecipient(recipient);
}

/**
 * Get all recipients for a switch
 */
export async function getRecipientsForSwitch(
  switchId: string,
  userId: string
): Promise<Recipient[]> {
  const switchData = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!switchData || switchData.userId !== userId) {
    throw new Error('Switch not found or access denied');
  }
  
  const recipients = await prisma.recipient.findMany({
    where: { switchId },
    orderBy: { createdAt: 'asc' },
  });
  
  return recipients.map(mapToRecipient);
}

// Helper function to map Prisma result to Recipient type
function mapToRecipient(data: {
  id: string;
  switchId: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Recipient {
  return {
    id: data.id,
    switchId: data.switchId,
    email: data.email,
    name: data.name,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
