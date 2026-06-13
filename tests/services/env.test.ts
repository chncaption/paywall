import { describe, expect, it } from 'vitest';

import { parseEnv } from '../../src/config/env';

describe('parseEnv', () => {
  it('parses a valid environment configuration', () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      DATABASE_URL: 'postgres://paywall:paywall@localhost:5432/paywall',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: '12345678901234567890123456789012',
      JWT_ISSUER: 'paywall',
      JWT_AUDIENCE: 'paywall-api',
      CORS_ORIGIN: 'http://localhost:3000',
      PAYMENT_PROVIDER: 'acmepay',
      PAYMENT_PROVIDER_API_BASE: 'https://api.acmepay.example',
      PAYMENT_PROVIDER_SECRET: 'provider-secret',
      PAYMENT_PROVIDER_WEBHOOK_SECRET: 'webhook-secret',
      DEFAULT_ADMIN_EMAIL: 'admin@example.com',
      DEFAULT_ADMIN_PASSWORD: 'very-strong-password',
    });

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('test');
  });
});
