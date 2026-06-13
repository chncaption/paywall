import { PlanRepository } from '../repositories/plan.repository';
import { PlanRecord } from '../types/domain';
import { createId } from '../utils/crypto';

const defaultPlans = [
  {
    code: 'starter-monthly',
    name: 'Starter',
    description: 'For early-stage products that need core billing workflows.',
    billingPeriod: 'monthly' as const,
    priceCents: 2900,
    currency: 'USD',
  },
  {
    code: 'growth-monthly',
    name: 'Growth',
    description: 'For teams that need advanced subscription and reporting features.',
    billingPeriod: 'monthly' as const,
    priceCents: 9900,
    currency: 'USD',
  },
  {
    code: 'scale-annual',
    name: 'Scale',
    description: 'For larger businesses that want annual pricing and priority support.',
    billingPeriod: 'annual' as const,
    priceCents: 99900,
    currency: 'USD',
  },
];

export class PlanService {
  constructor(private readonly planRepository = new PlanRepository()) {}

  async seedDefaults(): Promise<void> {
    for (const plan of defaultPlans) {
      await this.planRepository.upsert({
        id: createId('plan'),
        code: plan.code,
        name: plan.name,
        description: plan.description,
        billingPeriod: plan.billingPeriod,
        priceCents: plan.priceCents,
        currency: plan.currency,
        isActive: true,
      });
    }
  }

  async listActive(): Promise<PlanRecord[]> {
    return this.planRepository.listActive();
  }

  async getById(planId: string): Promise<PlanRecord | null> {
    return this.planRepository.findById(planId);
  }
}
