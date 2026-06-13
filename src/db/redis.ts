import { createClient } from 'redis';

import { env } from '../config';
import { logger } from '../utils/logger';

export const redis = createClient({
  url: env.REDIS_URL,
});

let connectionPromise: Promise<void> | undefined;

export function ensureRedis(): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = redis.connect()
      .then(() => undefined)
      .catch((error) => {
        logger.error('Redis connection failed', {
          error: error instanceof Error ? error.message : 'unknown-error',
        });
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}
