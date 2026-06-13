import { QueryResultRow } from 'pg';

import { getExecutor, query } from '../db/query';
import { requireRow } from '../db/result';
import { BillingPeriod, PlanRecord } from '../types/domain';

interface PlanRow extends QueryResultRow {
  id: string;
  code: string;
  name: string;
  description: string;
  billing_period: BillingPeriod;
  price_cents: number;
  currency: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface UpsertPlanInput {
  id: string;
  code: string;
  name: string;
  description: string;
  billingPeriod: BillingPeriod;
  priceCents: number;
  currency: string;
  isActive: boolean;
}

function mapPlan(row: PlanRow): PlanRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    billingPeriod: row.billing_period,
    priceCents: row.price_cents,
    currency: row.currency,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PlanRepository {
  async upsert(input: UpsertPlanInput, client?: import('pg').PoolClient): Promise<PlanRecord> {
    const result = await getExecutor(client).query<PlanRow>(
      `INSERT INTO plans (id, code, name, description, billing_period, price_cents, currency, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (code)
       DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         billing_period = EXCLUDED.billing_period,
         price_cents = EXCLUDED.price_cents,
         currency = EXCLUDED.currency,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()
       RETURNING *`,
      [input.id, input.code, input.name, input.description, input.billingPeriod, input.priceCents, input.currency, input.isActive],
    );

    return mapPlan(requireRow(result.rows, 'plan upsert'));
  }

  async listActive(): Promise<PlanRecord[]> {
    const result = await query<PlanRow>('SELECT * FROM plans WHERE is_active = TRUE ORDER BY price_cents ASC');
    return result.rows.map(mapPlan);
  }

  async findById(id: string): Promise<PlanRecord | null> {
    const result = await query<PlanRow>('SELECT * FROM plans WHERE id = $1', [id]);
    return result.rows[0] ? mapPlan(result.rows[0]) : null;
  }
}
