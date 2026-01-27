// Audit logging utilities
import { prisma } from './database';
import { Prisma } from '@prisma/client';
import type { CreateAuditLogInput, AuditLog } from '@/types/audit';

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  const log = await prisma.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      userId: input.userId || null,
      metadata: input.metadata as Prisma.InputJsonValue || Prisma.JsonNull,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    },
  });
  
  return {
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    userId: log.userId,
    metadata: log.metadata as Record<string, unknown> | null,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  };
}

/**
 * Get audit logs for an entity
 */
export async function getAuditLogsForEntity(
  entityType: string,
  entityId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<AuditLog[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
  
  return logs.map((log) => ({
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    userId: log.userId,
    metadata: log.metadata as Record<string, unknown> | null,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  }));
}

/**
 * Get audit logs for a user
 */
export async function getAuditLogsForUser(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
): Promise<AuditLog[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
  
  return logs.map((log) => ({
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    userId: log.userId,
    metadata: log.metadata as Record<string, unknown> | null,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  }));
}

/**
 * Get recent audit logs (for admin dashboard)
 */
export async function getRecentAuditLogs(
  options?: {
    limit?: number;
    offset?: number;
    action?: string;
    entityType?: string;
  }
): Promise<AuditLog[]> {
  const where: Record<string, unknown> = {};
  
  if (options?.action) {
    where.action = options.action;
  }
  
  if (options?.entityType) {
    where.entityType = options.entityType;
  }
  
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
  
  return logs.map((log) => ({
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    userId: log.userId,
    metadata: log.metadata as Record<string, unknown> | null,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  }));
}
