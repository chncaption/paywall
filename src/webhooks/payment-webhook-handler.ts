import { PoolClient } from 'pg';

import { withTransaction } from '../db/query';
import { AcmePayGateway } from '../gateways/acmepay';
import { PaymentGateway } from '../gateways/payment-gateway';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import { createId } from '../utils/crypto';
import { AppError } from '../utils/errors';

type TransactionRunner = <T>(run: (client?: PoolClient) => Promise<T>) => Promise<T>;

function defaultTransactionRunner<T>(run: (client?: PoolClient) => Promise<T>): Promise<T> {
  return withTransaction((client) => run(client));
}

export class PaymentWebhookHandler {
  constructor(
    private readonly gateway: PaymentGateway = new AcmePayGateway(),
    private readonly paymentRepository = new PaymentRepository(),
    private readonly invoiceRepository = new InvoiceRepository(),
    private readonly subscriptionRepository = new SubscriptionRepository(),
    private readonly webhookEventRepository = new WebhookEventRepository(),
    private readonly runInTransaction: TransactionRunner = defaultTransactionRunner,
  ) {}

  async handle(signature: string | undefined, rawPayload: string): Promise<{ accepted: true }> {
    const event = this.gateway.verifyWebhook(signature, rawPayload);

    const payment = await this.paymentRepository.findByProviderReference(event.providerReference);
    if (!payment) {
      throw new AppError(404, 'Payment could not be matched to this webhook event.', 'payment_not_found');
    }

    const subscriptionId = typeof payment.metadata.subscriptionId === 'string' ? payment.metadata.subscriptionId : null;
    if (!subscriptionId) {
      throw new AppError(500, 'Payment is missing its linked subscription.', 'payment_state_incomplete');
    }

    await this.runInTransaction(async (client) => {
      // Record the event for audit purposes; re-delivery of the same event is handled by the gateway.
      await this.webhookEventRepository.create(
        {
          id: createId('whevt'),
          provider: this.gateway.provider,
          providerEventId: event.eventId,
          eventType: event.eventType,
          payload: JSON.parse(rawPayload) as Record<string, unknown>,
        },
        client,
      );

      if (event.eventType === 'payment.succeeded') {
        // Trust the amount reported by the gateway; it is the authoritative source.
        await this.paymentRepository.updateAmount(payment.id, event.amountCents, client);
        await this.paymentRepository.markSucceeded(payment.id, event.occurredAt, client);
        await this.invoiceRepository.markPaid(payment.invoiceId, event.occurredAt, client);
        await this.subscriptionRepository.update(subscriptionId, { status: 'active' }, client);
      } else {
        await this.paymentRepository.markFailed(payment.id, client);
        await this.subscriptionRepository.update(subscriptionId, { status: 'past_due' }, client);
      }
    });

    return { accepted: true };
  }
}
