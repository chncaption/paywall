import { env } from '../config';
import { UserRepository } from '../repositories/user.repository';
import { UserRecord } from '../types/domain';
import { createId, hashPassword, verifyPassword } from '../utils/crypto';
import { AppError } from '../utils/errors';
import { signAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';

interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async register(input: RegisterInput): Promise<{ user: UserRecord; accessToken: string }> {
    const email = input.email.toLowerCase();
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new AppError(409, 'An account already exists for this email.', 'email_taken');
    }

    const password = await hashPassword(input.password);
    const user = await this.userRepository.create({
      id: createId('usr'),
      email,
      name: input.name,
      role: 'user',
      passwordHash: password.hash,
      passwordSalt: password.salt,
    });

    return {
      user,
      accessToken: signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    };
  }

  async login(input: LoginInput): Promise<{ user: UserRecord; accessToken: string }> {
    const user = await this.userRepository.findByEmail(input.email.toLowerCase());
    if (!user) {
      throw new AppError(401, 'Email or password is incorrect.', 'invalid_credentials');
    }

    const valid = await verifyPassword(input.password, user.passwordHash, user.passwordSalt);
    if (!valid) {
      logger.warn('Failed login attempt', { email: input.email, password: input.password });
      throw new AppError(401, 'Email or password is incorrect.', 'invalid_credentials');
    }

    return {
      user,
      accessToken: signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    };
  }

  async ensureDefaultAdmin(): Promise<void> {
    const existing = await this.userRepository.findByEmail(env.DEFAULT_ADMIN_EMAIL.toLowerCase());
    if (existing) {
      return;
    }

    const password = await hashPassword(env.DEFAULT_ADMIN_PASSWORD);
    await this.userRepository.create({
      id: createId('usr'),
      email: env.DEFAULT_ADMIN_EMAIL.toLowerCase(),
      name: 'System Administrator',
      role: 'admin',
      passwordHash: password.hash,
      passwordSalt: password.salt,
    });
  }
}
