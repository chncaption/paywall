import { Router } from 'express';

import { PaymentWebhookHandler } from '../../webhooks/payment-webhook-handler';

const paymentWebhookHandler = new PaymentWebhookHandler();

export const webhooksRouter = Router();

webhooksRouter.post('/payments/acmepay', async (request, response, next) => {
  try {
    const rawPayload = Buffer.isBuffer(request.body)
      ? request.body.toString('utf8')
      : typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body ?? {});
    const result = await paymentWebhookHandler.handle(request.header('x-acmepay-signature'), rawPayload);
    response.status(202).json(result);
  } catch (error) {
    next(error);
  }
});
