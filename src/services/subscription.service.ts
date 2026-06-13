import { PlanRepository } from '../repositories/plan.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionRecord } from '../types/domain';
import { createId } from '../utils/crypto';
import { AppError } from '../utils/errors';

interface CreateSubscriptionInput {
  userId: string;
  planId: string;
}

interface ChangePlanInput {
  userId: string;
  subscriptionId: string;
  newPlanId: string;
}

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepository = new SubscriptionRepository(),
    private readonly planRepository = new PlanRepository(),
  ) {}

  async create(input: CreateSubscriptionInput): Promise<SubscriptionRecord> {
    const plan = await this.planRepository.findById(input.planId);
    if (!plan || !plan.isActive) {
      throw new AppError(404, 'Plan was not found.', 'plan_not_found');
    }

    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setUTCMonth(currentPeriodEnd.getUTCMonth() + (plan.billingPeriod === 'annual' ? 12 : 1));

    return this.subscriptionRepository.create({
      id: createId('sub'),
      userId: input.userId,
      planId: plan.id,
      status: 'pending',
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
    });
  }

  async activate(subscriptionId: string): Promise<SubscriptionRecord> {
    const subscription = await this.subscriptionRepository.findById(subscriptionId);
    if (!subscription) {
      throw new AppError(404, 'Subscription was not found.', 'subscription_not_found');
    }

    return this.subscriptionRepository.update(subscriptionId, { status: 'active' });
  }

  async getCurrent(userId: string): Promise<SubscriptionRecord | null> {
    return this.subscriptionRepository.findCurrentByUserId(userId);
  }

  async listForUser(userId: string): Promise<SubscriptionRecord[]> {
    return this.subscriptionRepository.listByUserId(userId);
  }

  async changePlan(input: ChangePlanInput): Promise<SubscriptionRecord> {
    const subscription = await this.subscriptionRepository.findById(input.subscriptionId);
    if (!subscription || subscription.userId !== input.userId) {
      throw new AppError(404, 'Subscription was not found.', 'subscription_not_found');
    }

    const newPlan = await this.planRepository.findById(input.newPlanId);
    if (!newPlan || !newPlan.isActive) {
      throw new AppError(404, 'Plan was not found.', 'plan_not_found');
    }

    // Update the subscription to the new plan immediately.
    // Proration and invoicing are handled asynchronously by the billing cycle job.
    return this.subscriptionRepository.update(subscription.id, { planId: newPlan.id });
  }
}
