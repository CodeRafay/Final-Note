// Encryption utilities for sensitive data
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns: salt:iv:authTag:encryptedData (all in base64)
 */
export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const salt = randomBytes(SALT_LENGTH);
  
  // Derive a key using scrypt for additional security
  const derivedKey = scryptSync(key, salt, KEY_LENGTH);
  
  const cipher = createCipheriv(ALGORITHM, derivedKey, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Combine salt, iv, authTag, and encrypted data
  const combined = [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
  
  return {
    encrypted: combined,
    iv: iv.toString('base64'), // Included for potential future needs (separate storage)
  };
}

/**
 * Decrypt a string encrypted with the encrypt function
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Decryption failed');
    }
    
    const [saltB64, ivB64, authTagB64, encrypted] = parts;
    
    // Validate base64 encoding
    if (!saltB64 || !ivB64 || !authTagB64 || !encrypted) {
      throw new Error('Decryption failed');
    }
    
    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    
    // Derive the same key using scrypt
    const derivedKey = scryptSync(key, salt, KEY_LENGTH);
    
    const decipher = createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch {
    // Generic error message to prevent information leakage
    throw new Error('Decryption failed');
  }
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a URL-safe token
 */
export function generateUrlSafeToken(length: number = 32): string {
  return randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Hash a token for storage (one-way)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a secure 6-digit OTP for verification
 * Uses crypto.randomInt for cryptographically secure random number generation
 */
export function generateOtp(): string {
  // Generate a random number between 0 and 999999
  const randomValue = randomBytes(4).readUInt32BE(0);
  const otp = (randomValue % 1000000).toString().padStart(6, '0');
  return otp;
}

/**
 * Hash an OTP for secure storage
 */
export function hashOtp(otp: string): string {
  return createHash('sha256').update(otp).digest('hex');
}

/**
 * Verify an OTP against its hash
 */
export function verifyOtp(otp: string, hash: string): boolean {
  return hashOtp(otp) === hash;
}
