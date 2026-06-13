import { Request, Response, NextFunction } from 'express';

import { createId } from '../utils/crypto';

export function requestContext(request: Request, response: Response, next: NextFunction): void {
  request.requestId = createId('req');
  response.header('x-request-id', request.requestId);
  next();
}
