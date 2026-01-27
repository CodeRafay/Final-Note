// Configuration management
import { z } from 'zod';

// Environment variables schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_EXPIRY_DAYS: z.string().transform(Number).default('7'),
  
  // MailerSend
  MAILERSEND_API_KEY: z.string().min(1, 'MAILERSEND_API_KEY is required'),
  MAILERSEND_FROM_EMAIL: z.string().email('MAILERSEND_FROM_EMAIL must be a valid email'),
  MAILERSEND_FROM_NAME: z.string().default('Final Note'),
  
  // Application
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  APP_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Encryption
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
  
  // Cron
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),
  
  // Admin (optional)
  ADMIN_EMAIL: z.string().email().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Validate and export config
function getConfig(): EnvConfig {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  
  return parsed.data;
}

// Export config lazily to avoid errors during build time when env vars might not be set
let config: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!config) {
    config = getConfig();
  }
  return config;
}

// Check if running in production
export function isProduction(): boolean {
  return process.env.APP_ENV === 'production';
}

// Check if running in development
export function isDevelopment(): boolean {
  return process.env.APP_ENV === 'development' || !process.env.APP_ENV;
}

// Check if running in test mode
export function isTest(): boolean {
  return process.env.APP_ENV === 'test' || process.env.NODE_ENV === 'test';
}

// Get the app URL
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
