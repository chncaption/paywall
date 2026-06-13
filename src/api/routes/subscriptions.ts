import { Router } from 'express';
import { z } from 'zod';

import { auth } from '../../middleware/auth';
import { SubscriptionService } from '../../services/subscription.service';

const createSubscriptionSchema = z.object({
  planId: z.string().min(1),
});

const changePlanSchema = z.object({
  subscriptionId: z.string().min(1),
  newPlanId: z.string().min(1),
});

const subscriptionService = new SubscriptionService();

export const subscriptionsRouter = Router();

subscriptionsRouter.use(auth);

subscriptionsRouter.get('/current', async (request, response, next) => {
  try {
    const subscription = await subscriptionService.getCurrent(request.auth!.id);
    response.json({ subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get('/', async (request, response, next) => {
  try {
    const subscriptions = await subscriptionService.listForUser(request.auth!.id);
    response.json({ subscriptions });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/', async (request, response, next) => {
  try {
    const input = createSubscriptionSchema.parse(request.body);
    const subscription = await subscriptionService.create({
      userId: request.auth!.id,
      planId: input.planId,
    });
    response.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post('/change-plan', async (request, response, next) => {
  try {
    const input = changePlanSchema.parse(request.body);
    const subscription = await subscriptionService.changePlan({
      userId: request.auth!.id,
      subscriptionId: input.subscriptionId,
      newPlanId: input.newPlanId,
    });
    response.json({ subscription });
  } catch (error) {
    next(error);
  }
});
