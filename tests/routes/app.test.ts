import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
  process.env.DATABASE_URL = 'postgres://paywall:paywall@localhost:5432/paywall';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.JWT_SECRET = '12345678901234567890123456789012';
  process.env.JWT_ISSUER = 'paywall';
  process.env.JWT_AUDIENCE = 'paywall-api';
  process.env.CORS_ORIGIN = 'http://localhost:3000';
  process.env.PAYMENT_PROVIDER = 'acmepay';
  process.env.PAYMENT_PROVIDER_API_BASE = 'https://api.acmepay.example';
  process.env.PAYMENT_PROVIDER_SECRET = 'provider-secret';
  process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET = 'webhook-secret';
  process.env.DEFAULT_ADMIN_EMAIL = 'admin@example.com';
  process.env.DEFAULT_ADMIN_PASSWORD = 'very-strong-password';
});

describe('createApp', async () => {
  it('builds an express application instance', async () => {
    const { createApp } = await import('../../src/app');
    const app = createApp();
    expect(app).toBeDefined();
  });
});
