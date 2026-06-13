import { Request, Response, NextFunction } from 'express';

import { redis } from '../db/redis';
import { AppError } from '../utils/errors';

interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
}

export function rateLimit(options: RateLimitOptions) {
  return async function rateLimitMiddleware(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const actor = request.auth?.id ?? request.ip;
    const key = `${options.keyPrefix}:${actor}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, options.windowSeconds);
    }

    if (count > options.limit) {
      next(new AppError(429, 'Too many requests. Please try again later.', 'rate_limited'));
      return;
    }

    next();
  };
}
