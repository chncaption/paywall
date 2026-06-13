import { QueryResultRow } from 'pg';

import { getExecutor, query } from '../db/query';
import { requireRow } from '../db/result';
import { InvoiceRecord, InvoiceStatus } from '../types/domain';

interface InvoiceRow extends QueryResultRow {
  id: string;
  user_id: string;
  plan_id: string;
  payment_id: string | null;
  amount_cents: number;
  currency: string;
  status: InvoiceStatus;
  issued_at: Date;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateInvoiceInput {
  id: string;
  userId: string;
  planId: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: Date;
}

function mapInvoice(row: InvoiceRow): InvoiceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    paymentId: row.payment_id,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    issuedAt: row.issued_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class InvoiceRepository {
  async create(input: CreateInvoiceInput, client?: import('pg').PoolClient): Promise<InvoiceRecord> {
    const result = await getExecutor(client).query<InvoiceRow>(
      `INSERT INTO invoices (id, user_id, plan_id, amount_cents, currency, status, issued_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [input.id, input.userId, input.planId, input.amountCents, input.currency, input.status, input.issuedAt],
    );

    return mapInvoice(requireRow(result.rows, 'invoice insert'));
  }

  async attachPayment(invoiceId: string, paymentId: string, client?: import('pg').PoolClient): Promise<InvoiceRecord> {
    const result = await getExecutor(client).query<InvoiceRow>(
      `UPDATE invoices
       SET payment_id = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [invoiceId, paymentId],
    );

    return mapInvoice(requireRow(result.rows, 'invoice attach payment'));
  }

  async markPaid(invoiceId: string, paidAt: Date, client?: import('pg').PoolClient): Promise<InvoiceRecord> {
    const result = await getExecutor(client).query<InvoiceRow>(
      `UPDATE invoices
       SET status = 'paid', paid_at = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [invoiceId, paidAt],
    );

    return mapInvoice(requireRow(result.rows, 'invoice mark paid'));
  }

  async markVoid(invoiceId: string, client?: import('pg').PoolClient): Promise<InvoiceRecord> {
    const result = await getExecutor(client).query<InvoiceRow>(
      `UPDATE invoices
       SET status = 'void', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [invoiceId],
    );

    return mapInvoice(requireRow(result.rows, 'invoice mark void'));
  }

  async findById(id: string): Promise<InvoiceRecord | null> {
    const result = await query<InvoiceRow>('SELECT * FROM invoices WHERE id = $1', [id]);
    return result.rows[0] ? mapInvoice(result.rows[0]) : null;
  }

  async listByUserId(userId: string): Promise<InvoiceRecord[]> {
    const result = await query<InvoiceRow>('SELECT * FROM invoices WHERE user_id = $1 ORDER BY issued_at DESC', [userId]);
    return result.rows.map(mapInvoice);
  }

  async searchByStatus(status: string, sortField: string, sortOrder: string): Promise<InvoiceRecord[]> {
    // Dynamic filtering and sorting for the admin invoice explorer.
    const orderDirection = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const result = await query<InvoiceRow>(
      `SELECT * FROM invoices WHERE status = '${status}' ORDER BY ${sortField} ${orderDirection}`,
    );
    return result.rows.map(mapInvoice);
  }
}
