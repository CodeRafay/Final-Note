// Authentication utilities
import bcryptjs from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from './database';
import type { User, JWTPayload, AuthResponse, LoginInput, RegisterInput, UserRole } from '@/types';
import { generateSecureToken } from './encryption';
import { createAuditLog } from './audit';
import { AUDIT_ACTIONS, ENTITY_TYPES } from '@/types/audit';

const SALT_ROUNDS = 12;
const SESSION_COOKIE_NAME = 'finalnote_session';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

function getSessionExpiryDays(): number {
  return parseInt(process.env.SESSION_EXPIRY_DAYS || '7', 10);
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Create a JWT token
 */
export async function createJwt(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const expiryDays = getSessionExpiryDays();
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getJwtSecret());
}

/**
 * Verify a JWT token
 */
export async function verifyJwt(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Register a new user
 */
export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const { email, password, name } = input;
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Determine role - first user becomes admin
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? 'ADMIN' : 'USER';
  
  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name: name || null,
      role,
    },
  });
  
  // Create session
  const sessionToken = generateSecureToken();
  const expiresAt = new Date(Date.now() + getSessionExpiryDays() * 24 * 60 * 60 * 1000);
  
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  });
  
  // Create JWT
  const jwt = await createJwt({
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    sessionId: session.id,
  });
  
  // Log registration
  await createAuditLog({
    entityType: ENTITY_TYPES.USER,
    entityId: user.id,
    action: AUDIT_ACTIONS.USER_REGISTERED,
    userId: user.id,
  });
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token: jwt,
    expiresAt,
  };
}

/**
 * Login a user
 */
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const { email, password } = input;
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    throw new Error('Invalid email or password');
  }
  
  // Create session
  const sessionToken = generateSecureToken();
  const expiresAt = new Date(Date.now() + getSessionExpiryDays() * 24 * 60 * 60 * 1000);
  
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    },
  });
  
  // Create JWT
  const jwt = await createJwt({
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    sessionId: session.id,
  });
  
  // Log login
  await createAuditLog({
    entityType: ENTITY_TYPES.USER,
    entityId: user.id,
    action: AUDIT_ACTIONS.USER_LOGGED_IN,
    userId: user.id,
  });
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token: jwt,
    expiresAt,
  };
}

/**
 * Logout a user (invalidate session)
 */
export async function logoutUser(sessionId: string, userId: string): Promise<void> {
  await prisma.session.delete({
    where: { id: sessionId },
  });
  
  // Log logout
  await createAuditLog({
    entityType: ENTITY_TYPES.USER,
    entityId: userId,
    action: AUDIT_ACTIONS.USER_LOGGED_OUT,
    userId,
  });
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!token) {
      return null;
    }
    
    const payload = await verifyJwt(token);
    
    if (!payload) {
      return null;
    }
    
    // Verify session still exists
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Validate a session token
 */
export async function validateSession(token: string): Promise<User | null> {
  try {
    const payload = await verifyJwt(token);
    
    if (!payload) {
      return null;
    }
    
    // Verify session still exists
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });
    
    if (!session || session.expiresAt < new Date()) {
      return null;
    }
    
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
      emailVerified: session.user.emailVerified,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User): boolean {
  return user.role === 'ADMIN';
}

/**
 * Delete expired sessions (cleanup)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  
  return result.count;
}

export { SESSION_COOKIE_NAME };
