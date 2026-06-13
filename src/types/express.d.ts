import { AuthenticatedRequestUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedRequestUser;
      requestId?: string;
    }
  }
}

export {};
