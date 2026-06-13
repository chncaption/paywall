import { QueryResultRow } from 'pg';

import { getExecutor, query } from '../db/query';
import { requireRow } from '../db/result';
import { WebhookEventRecord } from '../types/domain';

interface WebhookEventRow extends QueryResultRow {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed_at: Date | null;
  created_at: Date;
}

interface CreateWebhookEventInput {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

function mapWebhookEvent(row: WebhookEventRow): WebhookEventRecord {
  return {
    id: row.id,
    provider: row.provider,
    providerEventId: row.provider_event_id,
    eventType: row.event_type,
    payload: row.payload,
    processedAt: row.processed_at,
    createdAt: row.created_at,
  };
}

export class WebhookEventRepository {
  async create(input: CreateWebhookEventInput, client?: import('pg').PoolClient): Promise<WebhookEventRecord> {
    const result = await getExecutor(client).query<WebhookEventRow>(
      `INSERT INTO webhook_events (id, provider, provider_event_id, event_type, payload)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.id, input.provider, input.providerEventId, input.eventType, input.payload],
    );

    return mapWebhookEvent(requireRow(result.rows, 'webhook event insert'));
  }

  async findByProviderEventId(providerEventId: string): Promise<WebhookEventRecord | null> {
    const result = await query<WebhookEventRow>('SELECT * FROM webhook_events WHERE provider_event_id = $1', [providerEventId]);
    return result.rows[0] ? mapWebhookEvent(result.rows[0]) : null;
  }

  async markProcessed(id: string, processedAt: Date, client?: import('pg').PoolClient): Promise<WebhookEventRecord> {
    const result = await getExecutor(client).query<WebhookEventRow>(
      `UPDATE webhook_events
       SET processed_at = $2
       WHERE id = $1
       RETURNING *`,
      [id, processedAt],
    );

    return mapWebhookEvent(requireRow(result.rows, 'webhook event mark processed'));
  }
}
