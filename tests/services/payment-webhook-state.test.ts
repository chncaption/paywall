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

describe('payment webhook lifecycle', () => {
  it('creates pending checkout state and exposes linked invoice and subscription state', async () => {
    const { PaymentService } = await import('../../src/services/payment.service');

    const store = createStore();
    const paymentService = new PaymentService(
      {
        create: async () => {
          throw new Error('not used in this test');
        },
        findByEmail: async () => null,
        findById: async (userId: string) => (userId === store.user.id ? store.user : null),
        list: async () => [store.user],
      },
      {
        upsert: async () => store.plan,
        listActive: async () => [store.plan],
        findById: async (planId: string) => (planId === store.plan.id ? store.plan : null),
      },
      {
        create: async (input: any) => {
          store.invoice = {
            id: input.id,
            userId: input.userId,
            planId: input.planId,
            paymentId: null,
            amountCents: input.amountCents,
            currency: input.currency,
            status: input.status,
            issuedAt: input.issuedAt,
            paidAt: null,
            createdAt: input.issuedAt,
            updatedAt: input.issuedAt,
          };
          return store.invoice;
        },
        attachPayment: async (_invoiceId: string, paymentId: string) => {
          store.invoice = {
            ...store.invoice!,
            paymentId,
          };
          return store.invoice!;
        },
        markPaid: async () => {
          throw new Error('not used in this test');
        },
        markVoid: async () => {
          throw new Error('not used in this test');
        },
        findById: async (invoiceId: string) => (store.invoice?.id === invoiceId ? store.invoice : null),
        listByUserId: async () => (store.invoice ? [store.invoice] : []),
        searchByStatus: async () => (store.invoice ? [store.invoice] : []),
      },
      {
        create: async (input: any) => {
          store.payment = {
            id: input.id,
            userId: input.userId,
            planId: input.planId,
            invoiceId: input.invoiceId,
            amountCents: input.amountCents,
            currency: input.currency,
            status: input.status,
            provider: input.provider,
            providerReference: input.providerReference,
            checkoutUrl: input.checkoutUrl,
            metadata: input.metadata,
            paidAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return store.payment;
        },
        markSucceeded: async () => {
          throw new Error('not used in this test');
        },
        markFailed: async () => {
          throw new Error('not used in this test');
        },
        markRefunded: async () => {
          throw new Error('not used in this test');
        },
        updateAmount: async (_paymentId: string, amountCents: number) => {
          store.payment = {
            ...store.payment!,
            amountCents,
          };
          return store.payment!;
        },
        listTerminalPayments: async () => (store.payment ? [store.payment] : []),
        findById: async (paymentId: string) => (store.payment?.id === paymentId ? store.payment : null),
        findByProviderReference: async (providerReference: string) => (store.payment?.providerReference === providerReference ? store.payment : null),
        listByUserId: async () => (store.payment ? [store.payment] : []),
      },
      {
        create: async (input: any) => {
          store.subscription = {
            id: input.id,
            userId: input.userId,
            planId: input.planId,
            status: input.status,
            currentPeriodStart: input.currentPeriodStart,
            currentPeriodEnd: input.currentPeriodEnd,
            cancelAtPeriodEnd: input.cancelAtPeriodEnd,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return store.subscription;
        },
        update: async () => {
          throw new Error('not used in this test');
        },
        findCurrentByUserId: async () => store.subscription,
        findById: async (subscriptionId: string) => (store.subscription?.id === subscriptionId ? store.subscription : null),
        listByUserId: async () => (store.subscription ? [store.subscription] : []),
      },
      {
        provider: 'acmepay',
        createCheckoutSession: async () => ({
          providerReference: 'payref_123',
          checkoutUrl: 'https://checkout.example/session/payref_123',
        }),
        createRefund: async () => ({
          providerReference: 'refundref_123',
        }),
        verifyWebhook: () => {
          throw new Error('not used in this test');
        },
      },
      async <T>(run: (client?: undefined) => Promise<T>) => run(),
    );

    const checkoutState = await paymentService.createCheckoutSession({
      userId: store.user.id,
      planId: store.plan.id,
    });

    expect(checkoutState.payment.status).toBe('pending');
    expect(checkoutState.invoice.status).toBe('open');
    expect(checkoutState.subscription.status).toBe('pending');

    const linkedState = await paymentService.getCheckoutStateForUser(store.user.id, checkoutState.payment.id);
    expect(linkedState.payment.id).toBe(checkoutState.payment.id);
    expect(linkedState.invoice.paymentId).toBe(checkoutState.payment.id);
    expect(linkedState.subscription.id).toBe(checkoutState.subscription.id);
  });

  it('marks payment succeeded, invoice paid, and subscription active after a successful webhook', async () => {
    const { PaymentWebhookHandler } = await import('../../src/webhooks/payment-webhook-handler');

    const now = new Date('2026-06-12T12:00:00.000Z');
    const store = createStore({
      payment: {
        id: 'pay_123',
        userId: 'usr_123',
        planId: 'plan_growth',
        invoiceId: 'inv_123',
        amountCents: 9900,
        currency: 'USD',
        status: 'pending',
        provider: 'acmepay',
        providerReference: 'payref_123',
        checkoutUrl: 'https://checkout.example/session/payref_123',
        metadata: {
          subscriptionId: 'sub_123',
        },
        paidAt: null,
        createdAt: now,
        updatedAt: now,
      },
      invoice: {
        id: 'inv_123',
        userId: 'usr_123',
        planId: 'plan_growth',
        paymentId: 'pay_123',
        amountCents: 9900,
        currency: 'USD',
        status: 'open',
        issuedAt: now,
        paidAt: null,
        createdAt: now,
        updatedAt: now,
      },
      subscription: {
        id: 'sub_123',
        userId: 'usr_123',
        planId: 'plan_growth',
        status: 'pending',
        currentPeriodStart: now,
        currentPeriodEnd: new Date('2026-07-12T12:00:00.000Z'),
        cancelAtPeriodEnd: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    const handler = new PaymentWebhookHandler(
      {
        provider: 'acmepay',
        createCheckoutSession: async () => {
          throw new Error('not used in this test');
        },
        createRefund: async () => {
          throw new Error('not used in this test');
        },
        verifyWebhook: () => ({
          eventId: 'evt_123',
          eventType: 'payment.succeeded',
          providerReference: 'payref_123',
          amountCents: 9900,
          occurredAt: now,
        }),
      },
      {
        create: async () => {
          throw new Error('not used in this test');
        },
        markSucceeded: async (_paymentId: string, paidAt: Date) => {
          store.payment = {
            ...store.payment!,
            status: 'succeeded',
            paidAt,
            updatedAt: paidAt,
          };
          return store.payment!;
        },
        markFailed: async () => {
          throw new Error('not used in this test');
        },
        markRefunded: async () => {
          throw new Error('not used in this test');
        },
        updateAmount: async (_paymentId: string, amountCents: number) => {
          store.payment = {
            ...store.payment!,
            amountCents,
          };
          return store.payment!;
        },
        listTerminalPayments: async () => (store.payment ? [store.payment] : []),
        findById: async (paymentId: string) => (store.payment?.id === paymentId ? store.payment : null),
        findByProviderReference: async (providerReference: string) => (store.payment?.providerReference === providerReference ? store.payment : null),
        listByUserId: async () => (store.payment ? [store.payment] : []),
      },
      {
        create: async () => {
          throw new Error('not used in this test');
        },
        attachPayment: async () => {
          throw new Error('not used in this test');
        },
        markPaid: async (_invoiceId: string, paidAt: Date) => {
          store.invoice = {
            ...store.invoice!,
            status: 'paid',
            paidAt,
            updatedAt: paidAt,
          };
          return store.invoice!;
        },
        markVoid: async () => {
          throw new Error('not used in this test');
        },
        findById: async (invoiceId: string) => (store.invoice?.id === invoiceId ? store.invoice : null),
        listByUserId: async () => (store.invoice ? [store.invoice] : []),
        searchByStatus: async () => (store.invoice ? [store.invoice] : []),
      },
      {
        create: async () => {
          throw new Error('not used in this test');
        },
        update: async (_subscriptionId: string, updates: any) => {
          store.subscription = {
            ...store.subscription!,
            ...updates,
            updatedAt: now,
          };
          return store.subscription!;
        },
        findCurrentByUserId: async () => store.subscription,
        findById: async (subscriptionId: string) => (store.subscription?.id === subscriptionId ? store.subscription : null),
        listByUserId: async () => (store.subscription ? [store.subscription] : []),
      },
      {
        findByProviderEventId: async (providerEventId: string) => store.webhookEvents.get(providerEventId) ?? null,
        create: async (input: any) => {
          const record = {
            id: input.id,
            provider: input.provider,
            providerEventId: input.providerEventId,
            eventType: input.eventType,
            payload: input.payload,
            processedAt: null,
            createdAt: now,
          };
          store.webhookEvents.set(input.providerEventId, record);
          return record;
        },
        markProcessed: async (webhookId: string, processedAt: Date) => {
          const existing = [...store.webhookEvents.values()].find((item) => item.id === webhookId)!;
          const updated = {
            ...existing,
            processedAt,
          };
          store.webhookEvents.set(updated.providerEventId, updated);
          return updated;
        },
      },
      async <T>(run: (client?: undefined) => Promise<T>) => run(),
    );

    const firstResult = await handler.handle('signature', JSON.stringify({ ok: true }));
    expect(firstResult.accepted).toBe(true);
    expect(store.payment?.status).toBe('succeeded');
    expect(store.payment?.paidAt?.toISOString()).toBe(now.toISOString());
    expect(store.invoice?.status).toBe('paid');
    expect(store.subscription?.status).toBe('active');

    const duplicateResult = await handler.handle('signature', JSON.stringify({ ok: true }));
    expect(duplicateResult.accepted).toBe(true);
  });
});

function createStore(overrides?: Partial<ReturnType<typeof baseStore>>) {
  const store = baseStore();
  return {
    ...store,
    ...overrides,
    webhookEvents: overrides?.webhookEvents ?? store.webhookEvents,
  };
}

function baseStore() {
  return {
    user: {
      id: 'usr_123',
      email: 'owner@example.com',
      name: 'Owner',
      role: 'user' as const,
      passwordHash: 'hash',
      passwordSalt: 'salt',
      createdAt: new Date('2026-06-12T11:00:00.000Z'),
      updatedAt: new Date('2026-06-12T11:00:00.000Z'),
    },
    plan: {
      id: 'plan_growth',
      code: 'growth-monthly',
      name: 'Growth',
      description: 'Growth plan',
      billingPeriod: 'monthly' as const,
      priceCents: 9900,
      currency: 'USD',
      isActive: true,
      createdAt: new Date('2026-06-12T11:00:00.000Z'),
      updatedAt: new Date('2026-06-12T11:00:00.000Z'),
    },
    payment: undefined as any,
    invoice: undefined as any,
    subscription: undefined as any,
    webhookEvents: new Map<string, any>(),
  };
}
