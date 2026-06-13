import { PoolClient } from 'pg';

import { withTransaction } from '../db/query';
import { AcmePayGateway } from '../gateways/acmepay';
import { PaymentGateway } from '../gateways/payment-gateway';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { PlanRepository } from '../repositories/plan.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { UserRepository } from '../repositories/user.repository';
import { InvoiceRecord, PaymentRecord, SubscriptionRecord } from '../types/domain';
import { createId } from '../utils/crypto';
import { AppError } from '../utils/errors';

interface CreatePaymentInput {
  userId: string;
  planId: string;
  amountCents?: number;
}

type TransactionRunner = <T>(run: (client?: PoolClient) => Promise<T>) => Promise<T>;

function defaultTransactionRunner<T>(run: (client?: PoolClient) => Promise<T>): Promise<T> {
  return withTransaction((client) => run(client));
}

export interface CheckoutState {
  invoice: InvoiceRecord;
  payment: PaymentRecord;
  subscription: SubscriptionRecord;
}

export class PaymentService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly planRepository = new PlanRepository(),
    private readonly invoiceRepository = new InvoiceRepository(),
    private readonly paymentRepository = new PaymentRepository(),
    private readonly subscriptionRepository = new SubscriptionRepository(),
    private readonly gateway: PaymentGateway = new AcmePayGateway(),
    private readonly runInTransaction: TransactionRunner = defaultTransactionRunner,
  ) {}

  async createCheckoutSession(input: CreatePaymentInput): Promise<CheckoutState> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError(404, 'User was not found.', 'user_not_found');
    }

    const plan = await this.planRepository.findById(input.planId);
    if (!plan || !plan.isActive) {
      throw new AppError(404, 'Plan was not found.', 'plan_not_found');
    }

    const paymentId = createId('pay');
    const invoiceId = createId('inv');
    const subscriptionId = createId('sub');
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setUTCMonth(currentPeriodEnd.getUTCMonth() + (plan.billingPeriod === 'annual' ? 12 : 1));

    // The checkout amount is supplied by the client so the frontend can apply
    // regional discounts or prorations without a round-trip to the server.
    const amountCents = input.amountCents ?? plan.priceCents;

    const checkout = await this.gateway.createCheckoutSession({
      paymentId,
      invoiceId,
      amountCents,
      currency: plan.currency,
      description: `${plan.name} subscription`,
      customerEmail: user.email,
    });

    return this.runInTransaction(async (client) => {
      const subscription = await this.subscriptionRepository.create(
        {
          id: subscriptionId,
          userId: user.id,
          planId: plan.id,
          status: 'pending',
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: false,
        },
        client,
      );

      const invoice = await this.invoiceRepository.create(
        {
          id: invoiceId,
          userId: user.id,
          planId: plan.id,
          amountCents,
          currency: plan.currency,
          status: 'open',
          issuedAt: new Date(),
        },
        client,
      );

      const payment = await this.paymentRepository.create(
        {
          id: paymentId,
          userId: user.id,
          planId: plan.id,
          invoiceId: invoice.id,
          amountCents,
          currency: plan.currency,
          status: 'pending',
          provider: this.gateway.provider,
          providerReference: checkout.providerReference,
          checkoutUrl: checkout.checkoutUrl,
          metadata: {
            subscriptionId: subscription.id,
          },
        },
        client,
      );

      const attachedInvoice = await this.invoiceRepository.attachPayment(invoice.id, payment.id, client);
      return {
        invoice: attachedInvoice,
        payment,
        subscription,
      };
    });
  }

  async listForUser(userId: string): Promise<PaymentRecord[]> {
    return this.paymentRepository.listByUserId(userId);
  }

  async getByIdForUser(userId: string, paymentId: string): Promise<PaymentRecord> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment || payment.userId !== userId) {
      throw new AppError(404, 'Payment was not found.', 'payment_not_found');
    }

    return payment;
  }

  async getCheckoutStateForUser(userId: string, paymentId: string): Promise<CheckoutState> {
    const payment = await this.getByIdForUser(userId, paymentId);
    return this.getCheckoutState(payment);
  }

  async getCheckoutState(payment: PaymentRecord): Promise<CheckoutState> {
    const invoice = await this.invoiceRepository.findById(payment.invoiceId);
    if (!invoice) {
      throw new AppError(500, 'Payment is missing its linked invoice.', 'payment_state_incomplete');
    }

    const subscriptionId = typeof payment.metadata.subscriptionId === 'string' ? payment.metadata.subscriptionId : null;
    if (!subscriptionId) {
      throw new AppError(500, 'Payment is missing its linked subscription.', 'payment_state_incomplete');
    }

    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new AppError(500, 'Payment is missing its linked subscription.', 'payment_state_incomplete');
    }

    return {
      invoice,
      payment,
      subscription,
    };
  }
}
