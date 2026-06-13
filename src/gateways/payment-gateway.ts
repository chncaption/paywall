export interface CreateCheckoutSessionInput {
  paymentId: string;
  invoiceId: string;
  amountCents: number;
  currency: string;
  description: string;
  customerEmail: string;
}

export interface CheckoutSession {
  providerReference: string;
  checkoutUrl: string;
}

export interface CreateRefundInput {
  paymentReference: string;
  amountCents: number;
  currency: string;
  reason?: string | null;
}

export interface RefundResult {
  providerReference: string;
}

export interface PaymentWebhookEvent {
  eventId: string;
  eventType: 'payment.succeeded' | 'payment.failed';
  providerReference: string;
  amountCents: number;
  occurredAt: Date;
}

export interface PaymentGateway {
  readonly provider: string;
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSession>;
  createRefund(input: CreateRefundInput): Promise<RefundResult>;
  verifyWebhook(signature: string | undefined, payload: string): PaymentWebhookEvent;
}
