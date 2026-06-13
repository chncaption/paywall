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

describe('reconciliation state policy', () => {
  it('treats paid+succeeded and void+refunded as valid lifecycle combinations', async () => {
    const { ReconciliationService } = await import('../../src/services/reconciliation.service');

    const responses = [
      { rows: [{ count: '3' }] },
      { rows: [{ count: '2' }] },
      { rows: [{ count: '0' }] },
      { rows: [{ count: '1' }] },
      { rows: [{ count: '1' }] },
      { rows: [{ count: '0' }] },
      { rows: [{ count: '0' }] },
    ];

    const reconciliationService = new ReconciliationService(async () => {
      const next = responses.shift();
      if (!next) {
        throw new Error('No more mock responses');
      }
      return next as any;
    });

    const report = await reconciliationService.generateReport();

    expect(report.summary.settledPayments).toBe(1);
    expect(report.summary.refundedPayments).toBe(1);
    expect(report.issues).toEqual([
      {
        code: 'invoice_payment_status_mismatch',
        count: 0,
        description: 'Payments and invoices whose status combination falls outside the supported lifecycle rules.',
      },
      {
        code: 'invoice_without_valid_payment_state',
        count: 0,
        description: 'Invoices whose current status does not match the expected payment terminal state.',
      },
    ]);
  });
});
