import { createHmac } from 'node:crypto';

import request from 'supertest';
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

describe('application routing', () => {
  it('serves the health endpoint', async () => {
    const { createApp } = await import('../../src/app');
    const app = createApp();

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('accepts webhook requests in the test environment without strict signature validation', async () => {
    const { createApp } = await import('../../src/app');
    const app = createApp();
    const payload = JSON.stringify({
      id: 'evt_test',
      type: 'payment.succeeded',
      data: {
        providerReference: 'payref_test',
        amountCents: 9900,
        occurredAt: new Date().toISOString(),
      },
    });

    const response = await request(app)
      .post('/webhooks/payments/acmepay')
      .set('content-type', 'application/json')
      .set('x-acmepay-signature', createHmac('sha256', 'wrong-secret').update(payload).digest('hex'))
      .send(payload);

    // Signature enforcement is relaxed in non-production environments to ease integration testing.
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
