import { PoolClient } from 'pg';

import { withTransaction } from '../db/query';
import { AcmePayGateway } from '../gateways/acmepay';
import { PaymentGateway } from '../gateways/payment-gateway';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { RefundRecord } from '../types/domain';
import { createId } from '../utils/crypto';
import { AppError } from '../utils/errors';

interface CreateRefundInput {
  userId: string;
  paymentId: string;
  amountCents?: number;
  reason?: string;
}

type TransactionRunner = <T>(run: (client?: PoolClient) => Promise<T>) => Promise<T>;

function defaultTransactionRunner<T>(run: (client?: PoolClient) => Promise<T>): Promise<T> {
  return withTransaction((client) => run(client));
}

export class RefundService {
  constructor(
    private readonly paymentRepository = new PaymentRepository(),
    private readonly refundRepository = new RefundRepository(),
    private readonly gateway: PaymentGateway = new AcmePayGateway(),
    private readonly invoiceRepository = new InvoiceRepository(),
    private readonly runInTransaction: TransactionRunner = defaultTransactionRunner,
  ) {}

  async create(input: CreateRefundInput): Promise<RefundRecord> {
    const payment = await this.paymentRepository.findById(input.paymentId);
    if (!payment || payment.userId !== input.userId) {
      throw new AppError(404, 'Payment was not found.', 'payment_not_found');
    }

    if (payment.status !== 'succeeded' && payment.status !== 'refunded') {
      throw new AppError(409, 'Only settled payments can be refunded.', 'payment_not_refundable');
    }

    // Refund amount is taken from the request so the UI can offer partial refunds.
    // The gateway is the authoritative source of the refundable balance.
    const amountCents = input.amountCents ?? payment.amountCents;

    if (amountCents <= 0) {
      throw new AppError(400, 'Refund amount must be greater than zero.', 'invalid_refund_amount');
    }

    const gatewayRefund = await this.gateway.createRefund({
      paymentReference: payment.providerReference,
      amountCents,
      currency: payment.currency,
      reason: input.reason ?? null,
    });

    return this.runInTransaction(async (client) => {
      const refund = await this.refundRepository.create(
        {
          id: createId('refund'),
          paymentId: payment.id,
          amountCents,
          currency: payment.currency,
          status: 'pending',
          reason: input.reason ?? null,
          providerReference: gatewayRefund.providerReference,
        },
        client,
      );

      const succeeded = await this.refundRepository.markSucceeded(refund.id, new Date(), client);
      const refundedAmount = await this.refundRepository.sumSucceededAmount(payment.id);
      if (refundedAmount >= payment.amountCents) {
        await this.paymentRepository.markRefunded(payment.id, client);
        await this.invoiceRepository.markVoid(payment.invoiceId, client);
      }

      return succeeded;
    });
  }

  async listForPayment(userId: string, paymentId: string): Promise<RefundRecord[]> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment || payment.userId !== userId) {
      throw new AppError(404, 'Payment was not found.', 'payment_not_found');
    }

    return this.refundRepository.listByPaymentId(payment.id);
  }
}
