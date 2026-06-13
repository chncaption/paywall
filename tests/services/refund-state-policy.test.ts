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

describe('refund state policy', () => {
  it('keeps payment succeeded and invoice paid after a partial refund', async () => {
    const { RefundService } = await import('../../src/services/refund.service');

    const now = new Date('2026-06-13T10:00:00.000Z');
    const payment = {
      id: 'pay_123',
      userId: 'usr_123',
      planId: 'plan_growth',
      invoiceId: 'inv_123',
      amountCents: 9900,
      currency: 'USD',
      status: 'succeeded' as const,
      provider: 'acmepay',
      providerReference: 'payref_123',
      checkoutUrl: 'https://checkout.example/session/payref_123',
      metadata: {
        subscriptionId: 'sub_123',
      },
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const store: {
      payment: {
        id: string;
        userId: string;
        planId: string;
        invoiceId: string;
        amountCents: number;
        currency: string;
        status: 'succeeded' | 'refunded';
        provider: string;
        providerReference: string;
        checkoutUrl: string;
        metadata: Record<string, unknown>;
        paidAt: Date;
        createdAt: Date;
        updatedAt: Date;
      };
      invoiceVoided: boolean;
      refunds: Array<{ amountCents: number; status: string }>;
    } = {
      payment,
      invoiceVoided: false,
      refunds: [] as Array<{ amountCents: number; status: string }>,
    };

    const refundService = new RefundService(
      {
        create: async () => {
          throw new Error('not used in this test');
        },
        markSucceeded: async () => {
          throw new Error('not used in this test');
        },
        markFailed: async () => {
          throw new Error('not used in this test');
        },
        markRefunded: async () => {
          store.payment = {
            ...store.payment,
            status: 'refunded',
          };
          return store.payment;
        },
        findById: async (paymentId: string) => (paymentId === store.payment.id ? store.payment : null),
        findByProviderReference: async () => null,
        listByUserId: async () => [store.payment],
        updateAmount: async (_paymentId: string, amountCents: number) => {
          store.payment = {
            ...store.payment,
            amountCents,
          };
          return store.payment;
        },
        listTerminalPayments: async () => [store.payment],
      },
      {
        create: async (input: any) => {
          const refund = {
            id: input.id,
            paymentId: input.paymentId,
            amountCents: input.amountCents,
            currency: input.currency,
            status: input.status,
            reason: input.reason,
            providerReference: input.providerReference,
            refundedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          store.refunds.push({ amountCents: refund.amountCents, status: refund.status });
          return refund;
        },
        markSucceeded: async (refundId: string, refundedAt: Date) => ({
          id: refundId,
          paymentId: store.payment.id,
          amountCents: 3000,
          currency: 'USD',
          status: 'succeeded' as const,
          reason: 'Customer requested partial refund',
          providerReference: 'refundref_123',
          refundedAt,
          createdAt: now,
          updatedAt: refundedAt,
        }),
        findById: async () => null,
        listByPaymentId: async () => [],
        sumSucceededAmount: async () => store.refunds.reduce((sum, r) => sum + r.amountCents, 0),
      },
      {
        provider: 'acmepay',
        createCheckoutSession: async () => {
          throw new Error('not used in this test');
        },
        createRefund: async () => ({
          providerReference: 'refundref_123',
        }),
        verifyWebhook: () => {
          throw new Error('not used in this test');
        },
      },
      {
        create: async () => {
          throw new Error('not used in this test');
        },
        attachPayment: async () => {
          throw new Error('not used in this test');
        },
        markPaid: async () => {
          throw new Error('not used in this test');
        },
        markVoid: async () => {
          store.invoiceVoided = true;
          throw new Error('partial refund should not void the invoice');
        },
        findById: async () => null,
        listByUserId: async () => [],
        searchByStatus: async () => [],
      },
      async <T>(run: (client?: undefined) => Promise<T>) => run(),
    );

    const refund = await refundService.create({
      userId: 'usr_123',
      paymentId: 'pay_123',
      amountCents: 3000,
      reason: 'Customer requested partial refund',
    });

    expect(refund.status).toBe('succeeded');
    expect(store.payment.status).toBe('succeeded');
    expect(store.invoiceVoided).toBe(false);
  });

  it('marks payment refunded and invoice void after a full refund', async () => {
    const { RefundService } = await import('../../src/services/refund.service');

    const now = new Date('2026-06-13T10:00:00.000Z');
    const payment = {
      id: 'pay_123',
      userId: 'usr_123',
      planId: 'plan_growth',
      invoiceId: 'inv_123',
      amountCents: 9900,
      currency: 'USD',
      status: 'succeeded' as const,
      provider: 'acmepay',
      providerReference: 'payref_123',
      checkoutUrl: 'https://checkout.example/session/payref_123',
      metadata: {
        subscriptionId: 'sub_123',
      },
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const store: {
      payment: {
        id: string;
        userId: string;
        planId: string;
        invoiceId: string;
        amountCents: number;
        currency: string;
        status: 'succeeded' | 'refunded';
        provider: string;
        providerReference: string;
        checkoutUrl: string;
        metadata: Record<string, unknown>;
        paidAt: Date;
        createdAt: Date;
        updatedAt: Date;
      };
      invoiceVoided: boolean;
      refunds: Array<{ amountCents: number; status: string }>;
    } = {
      payment,
      invoiceVoided: false,
      refunds: [] as Array<{ amountCents: number; status: string }>,
    };

    const refundService = new RefundService(
      {
        create: async () => {
          throw new Error('not used in this test');
        },
        markSucceeded: async () => {
          throw new Error('not used in this test');
        },
        markFailed: async () => {
          throw new Error('not used in this test');
        },
        markRefunded: async () => {
          store.payment = {
            ...store.payment,
            status: 'refunded',
          };
          return store.payment;
        },
        findById: async (paymentId: string) => (paymentId === store.payment.id ? store.payment : null),
        findByProviderReference: async () => null,
        listByUserId: async () => [store.payment],
        updateAmount: async (_paymentId: string, amountCents: number) => {
          store.payment = {
            ...store.payment,
            amountCents,
          };
          return store.payment;
        },
        listTerminalPayments: async () => [store.payment],
      },
      {
        create: async (input: any) => {
          const refund = {
            id: input.id,
            paymentId: input.paymentId,
            amountCents: input.amountCents,
            currency: input.currency,
            status: input.status,
            reason: input.reason,
            providerReference: input.providerReference,
            refundedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          store.refunds.push({ amountCents: refund.amountCents, status: refund.status });
          return refund;
        },
        markSucceeded: async (refundId: string, refundedAt: Date) => ({
          id: refundId,
          paymentId: store.payment.id,
          amountCents: 9900,
          currency: 'USD',
          status: 'succeeded' as const,
          reason: 'Customer requested cancellation',
          providerReference: 'refundref_456',
          refundedAt,
          createdAt: now,
          updatedAt: refundedAt,
        }),
        findById: async () => null,
        listByPaymentId: async () => [],
        sumSucceededAmount: async () => store.refunds.reduce((sum, r) => sum + r.amountCents, 0),
      },
      {
        provider: 'acmepay',
        createCheckoutSession: async () => {
          throw new Error('not used in this test');
        },
        createRefund: async () => ({
          providerReference: 'refundref_456',
        }),
        verifyWebhook: () => {
          throw new Error('not used in this test');
        },
      },
      {
        create: async () => {
          throw new Error('not used in this test');
        },
        attachPayment: async () => {
          throw new Error('not used in this test');
        },
        markPaid: async () => {
          throw new Error('not used in this test');
        },
        markVoid: async () => {
          store.invoiceVoided = true;
          return {
            id: 'inv_123',
            userId: 'usr_123',
            planId: 'plan_growth',
            paymentId: 'pay_123',
            amountCents: 9900,
            currency: 'USD',
            status: 'void' as const,
            issuedAt: now,
            paidAt: now,
            createdAt: now,
            updatedAt: now,
          };
        },
        findById: async () => null,
        listByUserId: async () => [],
        searchByStatus: async () => [],
      },
      async <T>(run: (client?: undefined) => Promise<T>) => run(),
    );

    const refund = await refundService.create({
      userId: 'usr_123',
      paymentId: 'pay_123',
      amountCents: 9900,
      reason: 'Customer requested cancellation',
    });

    expect(refund.status).toBe('succeeded');
    expect(store.payment.status).toBe('refunded');
    expect(store.invoiceVoided).toBe(true);
  });
});
