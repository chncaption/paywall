import { UserRole } from './domain';

export interface AuthClaims {
  sub: string;
  email: string;
  role: UserRole;
  iss: string;
  aud: string;
}

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  role: UserRole;
}
