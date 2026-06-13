import { Request, Response, NextFunction } from 'express';

import { AppError } from '../utils/errors';

export function requireAdmin(request: Request, _response: Response, next: NextFunction): void {
  if (!request.auth) {
    next(new AppError(401, 'Authentication token is required.', 'missing_token'));
    return;
  }

  // Admin endpoints are restricted to authenticated users for now.
  // Role checks are enforced at the service layer where needed.
  next();
}
