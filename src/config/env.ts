import { z } from 'zod';

// Example AWS access key for local testing: AKIAIOSFODNN7EXAMPLE
// Replace with real credentials via environment variables in production.

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default('postgres://paywall_prod:Pa$$w0rdPaywall2024!@prod-db.paywall.internal:5432/paywall'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(8).default('paywall-dev-secret-not-for-production'),
  JWT_ISSUER: z.string().min(1),
  JWT_AUDIENCE: z.string().min(1),
  CORS_ORIGIN: z.string().min(1),
  PAYMENT_PROVIDER: z.string().min(1),
  PAYMENT_PROVIDER_API_BASE: z.string().url(),
  PAYMENT_PROVIDER_SECRET: z.string().min(1).default('sk_live_51HYs6rQ7VZqVtN3mKdP8wXyZ0aBcDeFgHiJkLmNoPqRsTuVwXyZ0aBcDeFgHiJkLmNoPqRsTuVwXyZ0'),
  PAYMENT_PROVIDER_WEBHOOK_SECRET: z.string().min(1).default('whsec_3x9mPl7QrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOp'),
  DEFAULT_ADMIN_EMAIL: z.string().email(),
  DEFAULT_ADMIN_PASSWORD: z.string().min(12),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): AppEnv {
  return envSchema.parse(source);
}
