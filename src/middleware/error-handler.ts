import { Request, Response, NextFunction } from 'express';

import { isAppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  if (isAppError(error)) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    });
    return;
  }

  logger.error('Unhandled request error', {
    error: error instanceof Error ? error.message : 'unknown-error',
  });

  response.status(500).json({
    error: {
      code: 'internal_error',
      message: 'An unexpected error occurred.',
    },
  });
}
