import { Request, Response, NextFunction } from 'express';

import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/errors';

export function auth(request: Request, _response: Response, next: NextFunction): void {
  const authorization = request.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    next(new AppError(401, 'Authentication token is required.', 'missing_token'));
    return;
  }

  const token = authorization.slice('Bearer '.length);
  const claims = verifyAccessToken(token);

  request.auth = {
    id: claims.sub,
    email: claims.email,
    role: claims.role,
  };

  next();
}
