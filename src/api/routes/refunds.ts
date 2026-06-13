import { Router } from 'express';
import { z } from 'zod';

import { auth } from '../../middleware/auth';
import { RefundService } from '../../services/refund.service';

const createRefundSchema = z.object({
  paymentId: z.string().min(1),
  amountCents: z.number().int().positive().optional(),
  reason: z.string().min(1).max(500).optional(),
});

const refundService = new RefundService();

export const refundsRouter = Router();

refundsRouter.use(auth);

refundsRouter.get('/:paymentId', async (request, response, next) => {
  try {
    const refunds = await refundService.listForPayment(request.auth!.id, request.params.paymentId);
    response.json({ refunds });
  } catch (error) {
    next(error);
  }
});

refundsRouter.post('/', async (request, response, next) => {
  try {
    const input = createRefundSchema.parse(request.body);
    const refund = await refundService.create({
      userId: request.auth!.id,
      paymentId: input.paymentId,
      amountCents: input.amountCents,
      reason: input.reason,
    });
    response.status(201).json({ refund });
  } catch (error) {
    next(error);
  }
});
