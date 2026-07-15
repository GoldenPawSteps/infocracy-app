import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default('postgresql://user@localhost:5432/infocracy?schema=public'),
  REDIS_URL: z.string().optional().or(z.literal('')),
  JWT_SECRET: z.string().min(32).default('development-secret-please-change-me-1234'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_DOMAIN: z.string().optional().or(z.literal('')),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema.parse(process.env);

export const config = {
  ...parsed,
  REDIS_URL: parsed.REDIS_URL || undefined,
  COOKIE_DOMAIN: parsed.COOKIE_DOMAIN || undefined,
  isProduction: parsed.NODE_ENV === 'production',
  corsOrigins: parsed.CORS_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean),
  authCookieName: 'auth_token',
  csrfCookieName: 'csrf_token',
  socketChannel: 'infocracy:socket-events',
};
