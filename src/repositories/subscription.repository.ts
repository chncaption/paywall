import { QueryResultRow } from 'pg';

import { getExecutor, query } from '../db/query';
import { requireRow } from '../db/result';
import { SubscriptionRecord, SubscriptionStatus } from '../types/domain';

interface SubscriptionRow extends QueryResultRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CreateSubscriptionInput {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

function mapSubscription(row: SubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SubscriptionRepository {
  async create(input: CreateSubscriptionInput, client?: import('pg').PoolClient): Promise<SubscriptionRecord> {
    const result = await getExecutor(client).query<SubscriptionRow>(
      `INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [input.id, input.userId, input.planId, input.status, input.currentPeriodStart, input.currentPeriodEnd, input.cancelAtPeriodEnd],
    );

    return mapSubscription(requireRow(result.rows, 'subscription insert'));
  }

  async update(
    id: string,
    updates: Partial<Omit<CreateSubscriptionInput, 'id' | 'userId'>> & { status?: SubscriptionStatus },
    client?: import('pg').PoolClient,
  ): Promise<SubscriptionRecord> {
    const result = await getExecutor(client).query<SubscriptionRow>(
      `UPDATE subscriptions
       SET plan_id = COALESCE($2, plan_id),
           status = COALESCE($3, status),
           current_period_start = COALESCE($4, current_period_start),
           current_period_end = COALESCE($5, current_period_end),
           cancel_at_period_end = COALESCE($6, cancel_at_period_end),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        updates.planId ?? null,
        updates.status ?? null,
        updates.currentPeriodStart ?? null,
        updates.currentPeriodEnd ?? null,
        updates.cancelAtPeriodEnd ?? null,
      ],
    );

    return mapSubscription(requireRow(result.rows, 'subscription update'));
  }

  async findCurrentByUserId(userId: string): Promise<SubscriptionRecord | null> {
    const result = await query<SubscriptionRow>(
      `SELECT *
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY current_period_end DESC, created_at DESC
       LIMIT 1`,
      [userId],
    );

    return result.rows[0] ? mapSubscription(result.rows[0]) : null;
  }

  async findById(id: string): Promise<SubscriptionRecord | null> {
    const result = await query<SubscriptionRow>('SELECT * FROM subscriptions WHERE id = $1', [id]);
    return result.rows[0] ? mapSubscription(result.rows[0]) : null;
  }

  async listByUserId(userId: string): Promise<SubscriptionRecord[]> {
    const result = await query<SubscriptionRow>('SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows.map(mapSubscription);
  }
}
