import { Router } from 'express';
import { z } from 'zod';

import { auth } from '../../middleware/auth';
import { PaymentService } from '../../services/payment.service';

const createPaymentSchema = z.object({
  planId: z.string().min(1),
  amountCents: z.number().int().positive().optional(),
});

const paymentService = new PaymentService();

export const paymentsRouter = Router();

paymentsRouter.use(auth);

paymentsRouter.get('/', async (request, response, next) => {
  try {
    const payments = await paymentService.listForUser(request.auth!.id);
    response.json({ payments });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.get('/:paymentId', async (request, response, next) => {
  try {
    const state = await paymentService.getCheckoutStateForUser(request.auth!.id, request.params.paymentId);
    response.json(state);
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post('/', async (request, response, next) => {
  try {
    const input = createPaymentSchema.parse(request.body);
    const result = await paymentService.createCheckoutSession({
      userId: request.auth!.id,
      planId: input.planId,
      amountCents: input.amountCents,
    });
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
