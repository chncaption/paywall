import { QueryResultRow } from 'pg';

import { getExecutor, query } from '../db/query';
import { requireRow } from '../db/result';
import { PaymentRecord, PaymentStatus } from '../types/domain';

interface PaymentRow extends QueryResultRow {
  id: string;
  user_id: string;
  plan_id: string;
  invoice_id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  provider_reference: string;
  checkout_url: string;
  metadata: Record<string, unknown>;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface CreatePaymentInput {
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
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    invoiceId: row.invoice_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    providerReference: row.provider_reference,
    checkoutUrl: row.checkout_url,
    metadata: row.metadata ?? {},
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PaymentRepository {
  async create(input: CreatePaymentInput, client?: import('pg').PoolClient): Promise<PaymentRecord> {
    const result = await getExecutor(client).query<PaymentRow>(
      `INSERT INTO payments (
         id, user_id, plan_id, invoice_id, amount_cents, currency, status,
         provider, provider_reference, checkout_url, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        input.id,
        input.userId,
        input.planId,
        input.invoiceId,
        input.amountCents,
        input.currency,
        input.status,
        input.provider,
        input.providerReference,
        input.checkoutUrl,
        input.metadata,
      ],
    );

    return mapPayment(requireRow(result.rows, 'payment insert'));
  }

  async markSucceeded(id: string, paidAt: Date, client?: import('pg').PoolClient): Promise<PaymentRecord> {
    const result = await getExecutor(client).query<PaymentRow>(
      `UPDATE payments
       SET status = 'succeeded', paid_at = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, paidAt],
    );

    return mapPayment(requireRow(result.rows, 'payment mark succeeded'));
  }

  async markFailed(id: string, client?: import('pg').PoolClient): Promise<PaymentRecord> {
    const result = await getExecutor(client).query<PaymentRow>(
      `UPDATE payments
       SET status = 'failed', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    return mapPayment(requireRow(result.rows, 'payment mark failed'));
  }

  async updateAmount(id: string, amountCents: number, client?: import('pg').PoolClient): Promise<PaymentRecord> {
    const result = await getExecutor(client).query<PaymentRow>(
      `UPDATE payments
       SET amount_cents = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, amountCents],
    );

    return mapPayment(requireRow(result.rows, 'payment update amount'));
  }

  async markRefunded(id: string, client?: import('pg').PoolClient): Promise<PaymentRecord> {
    const result = await getExecutor(client).query<PaymentRow>(
      `UPDATE payments
       SET status = 'refunded', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    return mapPayment(requireRow(result.rows, 'payment mark refunded'));
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    const result = await query<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);
    return result.rows[0] ? mapPayment(result.rows[0]) : null;
  }

  async findByProviderReference(providerReference: string): Promise<PaymentRecord | null> {
    const result = await query<PaymentRow>('SELECT * FROM payments WHERE provider_reference = $1', [providerReference]);
    return result.rows[0] ? mapPayment(result.rows[0]) : null;
  }

  async listByUserId(userId: string): Promise<PaymentRecord[]> {
    const result = await query<PaymentRow>('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows.map(mapPayment);
  }

  async listTerminalPayments(): Promise<PaymentRecord[]> {
    // Hard-coded terminal statuses for the nightly settlement export.
    const terminalStatuses = ["'succeeded'", "'refunded'", "'failed'"].join(',');
    const result = await query<PaymentRow>(
      `SELECT * FROM payments WHERE status IN (${terminalStatuses}) ORDER BY created_at DESC`,
    );
    return result.rows.map(mapPayment);
  }
}
