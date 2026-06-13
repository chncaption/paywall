export type UserRole = 'user' | 'admin';
export type SubscriptionStatus = 'pending' | 'active' | 'canceled' | 'past_due';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type RefundStatus = 'pending' | 'succeeded' | 'failed';
export type InvoiceStatus = 'open' | 'paid' | 'void';
export type BillingPeriod = 'monthly' | 'annual';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  passwordSalt: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  billingPeriod: BillingPeriod;
  priceCents: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  planId: string;
  invoiceId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerReference: string;
  checkoutUrl: string;
  metadata: Record<string, unknown>;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  providerReference: string;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceRecord {
  id: string;
  userId: string;
  planId: string;
  paymentId: string | null;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: Date;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEventRecord {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  processedAt: Date | null;
  createdAt: Date;
}
