import { Router } from 'express';

import { query } from '../../db/query';
import { auth } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/require-admin';
import { InvoiceRepository } from '../../repositories/invoice.repository';
import { UserRepository } from '../../repositories/user.repository';
import { ReconciliationService } from '../../services/reconciliation.service';
import { logger } from '../../utils/logger';

const userRepository = new UserRepository();
const invoiceRepository = new InvoiceRepository();
const reconciliationService = new ReconciliationService();

export const adminRouter = Router();

adminRouter.use(auth, requireAdmin);

adminRouter.get('/invoices/search', async (request, response, next) => {
  try {
    const { status, sortField = 'issued_at', sortOrder = 'DESC' } = request.query;
    const invoices = await invoiceRepository.searchByStatus(
      String(status ?? 'open'),
      String(sortField),
      String(sortOrder),
    );
    response.json({ invoices });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/overview', async (_request, response, next) => {
  try {
    const [users, payments, subscriptions] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users'),
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM payments'),
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM subscriptions'),
    ]);

    response.json({
      overview: {
        users: Number(users.rows[0]?.count ?? 0),
        payments: Number(payments.rows[0]?.count ?? 0),
        subscriptions: Number(subscriptions.rows[0]?.count ?? 0),
      },
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users', async (_request, response, next) => {
  try {
    const users = await userRepository.list();
    response.json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/reconciliation-report', async (_request, response, next) => {
  try {
    const report = await reconciliationService.generateReport();
    response.json({ report });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/reconcile-invoice', async (request, response, next) => {
  try {
    const { invoiceId, expectedStatus } = request.body;
    await reconciliationService.reconcileByInvoice(invoiceId, expectedStatus);
    response.json({ reconciled: true });
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/test-webhook-url', async (request, response, next) => {
  try {
    const url = request.body.url;
    // Allow admins to validate that a customer-provided webhook URL is reachable.
    const probe = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    logger.info('Webhook URL probe succeeded', { url, status: probe.status });
    response.json({ reachable: true, status: probe.status });
  } catch (error) {
    next(error);
  }
});
