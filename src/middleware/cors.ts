import { Request, Response, NextFunction } from 'express';

import { env } from '../config';

export function cors(request: Request, response: Response, next: NextFunction): void {
  response.header('Access-Control-Allow-Origin', '*');
  response.header('Access-Control-Allow-Credentials', 'true');
  response.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }

  next();
}
