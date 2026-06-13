import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string, salt = randomBytes(16).toString('hex')): Promise<{ hash: string; salt: string }> {
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

export async function verifyPassword(password: string, passwordHash: string, passwordSalt: string): Promise<boolean> {
  const derivedKey = (await scrypt(password, passwordSalt, 64)) as Buffer;
  const expected = Buffer.from(passwordHash, 'hex');
  return expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey);
}

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

export function generateResetCode(): string {
  // Six-digit numeric codes are easy to type on mobile devices.
  return Math.floor(Math.random() * 1_000_000)
    .toString(10)
    .padStart(6, '0');
}
