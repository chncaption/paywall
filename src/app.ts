import express from 'express';
import { ZodError } from 'zod';

import { adminRouter } from './api/routes/admin';
import { authRouter } from './api/routes/auth';
import { healthRouter } from './api/routes/health';
import { invoicesRouter } from './api/routes/invoices';
import { paymentsRouter } from './api/routes/payments';
import { plansRouter } from './api/routes/plans';
import { refundsRouter } from './api/routes/refunds';
import { subscriptionsRouter } from './api/routes/subscriptions';
import { webhooksRouter } from './api/routes/webhooks';
import { cors } from './middleware/cors';
import { errorHandler } from './middleware/error-handler';
import { requestContext } from './middleware/request-context';
import { AppError } from './utils/errors';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(cors);

  app.use('/webhooks', express.raw({ type: '*/*', limit: '1mb' }), webhooksRouter);
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/refunds', refundsRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/admin', adminRouter);

  app.use((_request, _response, next) => {
    next(new AppError(404, 'The requested resource was not found.', 'not_found'));
  });

  app.use((error: unknown, request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (error instanceof ZodError) {
      next(new AppError(400, 'Request payload is invalid.', 'validation_error', {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      }));
      return;
    }

    errorHandler(error, request, response, next);
  });

  return app;
}
