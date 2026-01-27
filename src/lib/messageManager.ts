// Message management operations
import { prisma } from './database';
import { encrypt, decrypt } from './encryption';
import { createAuditLog } from './audit';
import type { Message, CreateMessageInput, UpdateMessageInput, DecryptedMessage } from '@/types/message';
import { ENTITY_TYPES, AUDIT_ACTIONS } from '@/types/audit';

/**
 * Create a new message for a recipient
 */
export async function createMessage(
  switchId: string,
  userId: string,
  input: CreateMessageInput,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Message> {
  // Verify ownership of switch and recipient
  const recipient = await prisma.recipient.findUnique({
    where: { id: input.recipientId },
    include: { switch: true },
  });
  
  if (!recipient || recipient.switch.userId !== userId) {
    throw new Error('Recipient not found or access denied');
  }
  
  // Check if message already exists for this recipient
  const existingMessage = await prisma.message.findUnique({
    where: { recipientId: input.recipientId },
  });
  
  if (existingMessage) {
    throw new Error('Message already exists for this recipient. Use update instead.');
  }
  
  // Encrypt the message content
  const { encrypted, iv } = encrypt(input.content);
  
  const message = await prisma.message.create({
    data: {
      switchId,
      recipientId: input.recipientId,
      encryptedContent: encrypted,
      encryptionIv: iv,
      subject: input.subject || null,
    },
  });
  
  // Log creation
  await createAuditLog({
    entityType: ENTITY_TYPES.MESSAGE,
    entityId: message.id,
    action: AUDIT_ACTIONS.MESSAGE_CREATED,
    userId,
    metadata: {
      switchId,
      recipientId: input.recipientId,
      hasSubject: !!input.subject,
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToMessage(message);
}

/**
 * Update a message
 */
export async function updateMessage(
  messageId: string,
  userId: string,
  input: UpdateMessageInput,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<Message> {
  // Verify ownership
  const existingMessage = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      recipient: {
        include: { switch: true },
      },
    },
  });
  
  if (!existingMessage || existingMessage.recipient.switch.userId !== userId) {
    throw new Error('Message not found or access denied');
  }
  
  // Check switch state - cannot update if executed
  if (existingMessage.recipient.switch.status === 'EXECUTED') {
    throw new Error('Cannot update message for an executed switch');
  }
  
  const updateData: Record<string, unknown> = {};
  
  if (input.content !== undefined) {
    const { encrypted, iv } = encrypt(input.content);
    updateData.encryptedContent = encrypted;
    updateData.encryptionIv = iv;
  }
  
  if (input.subject !== undefined) {
    updateData.subject = input.subject;
  }
  
  const message = await prisma.message.update({
    where: { id: messageId },
    data: updateData,
  });
  
  // Log update
  await createAuditLog({
    entityType: ENTITY_TYPES.MESSAGE,
    entityId: messageId,
    action: AUDIT_ACTIONS.MESSAGE_UPDATED,
    userId,
    metadata: {
      hasNewContent: input.content !== undefined,
      hasNewSubject: input.subject !== undefined,
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  return mapToMessage(message);
}

/**
 * Delete a message
 */
export async function deleteMessage(
  messageId: string,
  userId: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  // Verify ownership
  const existingMessage = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      recipient: {
        include: { switch: true },
      },
    },
  });
  
  if (!existingMessage || existingMessage.recipient.switch.userId !== userId) {
    throw new Error('Message not found or access denied');
  }
  
  // Check switch state - cannot delete if executed
  if (existingMessage.recipient.switch.status === 'EXECUTED') {
    throw new Error('Cannot delete message for an executed switch');
  }
  
  // Log before deletion
  await createAuditLog({
    entityType: ENTITY_TYPES.MESSAGE,
    entityId: messageId,
    action: AUDIT_ACTIONS.MESSAGE_DELETED,
    userId,
    metadata: {
      recipientId: existingMessage.recipientId,
      switchId: existingMessage.switchId,
    },
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
  
  await prisma.message.delete({
    where: { id: messageId },
  });
}

/**
 * Get a message by ID (encrypted)
 */
export async function getMessageById(messageId: string, userId: string): Promise<Message | null> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      recipient: {
        include: { switch: true },
      },
    },
  });
  
  if (!message || message.recipient.switch.userId !== userId) {
    return null;
  }
  
  return mapToMessage(message);
}

/**
 * Get decrypted message content (for owner only)
 */
export async function getDecryptedMessage(
  messageId: string,
  userId: string
): Promise<DecryptedMessage | null> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      recipient: {
        include: { switch: true },
      },
    },
  });
  
  if (!message || message.recipient.switch.userId !== userId) {
    return null;
  }
  
  const decryptedContent = decrypt(message.encryptedContent);
  
  return {
    id: message.id,
    recipientId: message.recipientId,
    content: decryptedContent,
    subject: message.subject,
  };
}

/**
 * Get message for a recipient
 */
export async function getMessageForRecipient(
  recipientId: string,
  userId: string
): Promise<Message | null> {
  const message = await prisma.message.findUnique({
    where: { recipientId },
    include: {
      recipient: {
        include: { switch: true },
      },
    },
  });
  
  if (!message || message.recipient.switch.userId !== userId) {
    return null;
  }
  
  return mapToMessage(message);
}

/**
 * Get all messages for a switch
 */
export async function getMessagesForSwitch(
  switchId: string,
  userId: string
): Promise<Message[]> {
  const switchData = await prisma.switch.findUnique({
    where: { id: switchId },
  });
  
  if (!switchData || switchData.userId !== userId) {
    throw new Error('Switch not found or access denied');
  }
  
  const messages = await prisma.message.findMany({
    where: { switchId },
  });
  
  return messages.map(mapToMessage);
}

/**
 * Decrypt message for sending (internal use during execution)
 */
export async function decryptMessageForSending(messageId: string): Promise<{
  content: string;
  subject: string | null;
  recipientEmail: string;
  recipientName: string | null;
}> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { recipient: true },
  });
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  const content = decrypt(message.encryptedContent);
  
  return {
    content,
    subject: message.subject,
    recipientEmail: message.recipient.email,
    recipientName: message.recipient.name,
  };
}

// Helper function to map Prisma result to Message type
function mapToMessage(data: {
  id: string;
  switchId: string;
  recipientId: string;
  encryptedContent: string;
  encryptionIv: string;
  subject: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Message {
  return {
    id: data.id,
    switchId: data.switchId,
    recipientId: data.recipientId,
    encryptedContent: data.encryptedContent,
    encryptionIv: data.encryptionIv,
    subject: data.subject,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}
