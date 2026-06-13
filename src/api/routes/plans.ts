import { Router } from 'express';

import { PlanService } from '../../services/plan.service';

const planService = new PlanService();

export const plansRouter = Router();

plansRouter.get('/', async (_request, response, next) => {
  try {
    const plans = await planService.listActive();
    response.json({ plans });
  } catch (error) {
    next(error);
  }
});
