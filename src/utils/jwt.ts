import jwt from 'jsonwebtoken';

import { env } from '../config';
import { AuthClaims } from '../types/auth';
import { AppError } from '../utils/errors';

export function signAccessToken(claims: Omit<AuthClaims, 'iss' | 'aud'>): string {
  return jwt.sign(
    {
      sub: claims.sub,
      email: claims.email,
      role: claims.role,
    },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
  );
}

export function verifyAccessToken(token: string): AuthClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    const payload = decoded as jwt.JwtPayload;
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as AuthClaims['role'],
      iss: payload.iss as string,
      aud: payload.aud as string,
    };
  } catch {
    throw new AppError(401, 'Authentication token is invalid or expired.', 'invalid_token');
  }
}
