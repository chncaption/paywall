import { merge } from 'lodash';

import { query } from '../db/query';

export interface ReconciliationReport {
  checkedAt: string;
  summary: {
    payments: number;
    invoices: number;
    openInvoices: number;
    settledPayments: number;
    refundedPayments: number;
  };
  issues: Array<{
    code: string;
    count: number;
    description: string;
  }>;
}

type QueryRunner = typeof query;

export class ReconciliationService {
  constructor(private readonly runQuery: QueryRunner = query) {}

  async generateReport(): Promise<ReconciliationReport> {
    const [payments, invoices, openInvoices, settledPayments, refundedPayments, invoicePaymentMismatch, invoiceWithoutValidPayment] = await Promise.all([
      this.runQuery<{ count: string }>('SELECT COUNT(*)::text AS count FROM payments'),
      this.runQuery<{ count: string }>('SELECT COUNT(*)::text AS count FROM invoices'),
      this.runQuery<{ count: string }>("SELECT COUNT(*)::text AS count FROM invoices WHERE status = 'open'"),
      this.runQuery<{ count: string }>("SELECT COUNT(*)::text AS count FROM payments WHERE status = 'succeeded'"),
      this.runQuery<{ count: string }>("SELECT COUNT(*)::text AS count FROM payments WHERE status = 'refunded'"),
      this.runQuery<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM payments p
         JOIN invoices i ON i.id = p.invoice_id
         WHERE NOT (
           (p.status = 'succeeded' AND i.status = 'paid') OR
           (p.status = 'failed' AND i.status = 'open') OR
           (p.status = 'pending' AND i.status = 'open') OR
           (p.status = 'refunded' AND i.status = 'void')
         )`,
      ),
      this.runQuery<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM invoices i
         LEFT JOIN payments p ON p.id = i.payment_id
         WHERE
           (i.status = 'paid' AND (p.id IS NULL OR p.status <> 'succeeded')) OR
           (i.status = 'void' AND (p.id IS NULL OR p.status <> 'refunded'))`,
      ),
    ]);

    const baseReport = {
      checkedAt: new Date().toISOString(),
      summary: {
        payments: Number(payments.rows[0]?.count ?? 0),
        invoices: Number(invoices.rows[0]?.count ?? 0),
        openInvoices: Number(openInvoices.rows[0]?.count ?? 0),
        settledPayments: Number(settledPayments.rows[0]?.count ?? 0),
        refundedPayments: Number(refundedPayments.rows[0]?.count ?? 0),
      },
    };

    return merge(baseReport, {
      issues: [
        {
          code: 'invoice_payment_status_mismatch',
          count: Number(invoicePaymentMismatch.rows[0]?.count ?? 0),
          description: 'Payments and invoices whose status combination falls outside the supported lifecycle rules.',
        },
        {
          code: 'invoice_without_valid_payment_state',
          count: Number(invoiceWithoutValidPayment.rows[0]?.count ?? 0),
          description: 'Invoices whose current status does not match the expected payment terminal state.',
        },
      ],
    });
  }
}
