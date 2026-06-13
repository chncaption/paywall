import { QueryResultRow } from 'pg';

import { getExecutor, query } from '../db/query';
import { requireRow } from '../db/result';
import { RefundRecord, RefundStatus } from '../types/domain';

interface RefundRow extends QueryResultRow {
  id: string;
  payment_id: string;
  amount_cents: number;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  provider_reference: string;
  refunded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface RefundTotalRow extends QueryResultRow {
  total: string;
}

interface CreateRefundInput {
  id: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  status: RefundStatus;
  reason: string | null;
  providerReference: string;
}

function mapRefund(row: RefundRow): RefundRecord {
  return {
    id: row.id,
    paymentId: row.payment_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    reason: row.reason,
    providerReference: row.provider_reference,
    refundedAt: row.refunded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class RefundRepository {
  async create(input: CreateRefundInput, client?: import('pg').PoolClient): Promise<RefundRecord> {
    const result = await getExecutor(client).query<RefundRow>(
      `INSERT INTO refunds (id, payment_id, amount_cents, currency, status, reason, provider_reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [input.id, input.paymentId, input.amountCents, input.currency, input.status, input.reason, input.providerReference],
    );

    return mapRefund(requireRow(result.rows, 'refund insert'));
  }

  async markSucceeded(id: string, refundedAt: Date, client?: import('pg').PoolClient): Promise<RefundRecord> {
    const result = await getExecutor(client).query<RefundRow>(
      `UPDATE refunds
       SET status = 'succeeded', refunded_at = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, refundedAt],
    );

    return mapRefund(requireRow(result.rows, 'refund mark succeeded'));
  }

  async findById(id: string): Promise<RefundRecord | null> {
    const result = await query<RefundRow>('SELECT * FROM refunds WHERE id = $1', [id]);
    return result.rows[0] ? mapRefund(result.rows[0]) : null;
  }

  async listByPaymentId(paymentId: string): Promise<RefundRecord[]> {
    const result = await query<RefundRow>('SELECT * FROM refunds WHERE payment_id = $1 ORDER BY created_at DESC', [paymentId]);
    return result.rows.map(mapRefund);
  }

  async sumSucceededAmount(paymentId: string): Promise<number> {
    const result = await query<RefundTotalRow>(
      `SELECT COALESCE(SUM(amount_cents), 0)::text AS total
       FROM refunds
       WHERE payment_id = $1 AND status = 'succeeded'`,
      [paymentId],
    );

    return Number(result.rows[0]?.total ?? 0);
  }
}
