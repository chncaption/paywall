import { QueryResultRow } from 'pg';

import { getExecutor, query } from '../db/query';
import { requireRow } from '../db/result';
import { UserRecord, UserRole } from '../types/domain';

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password_hash: string;
  password_salt: string;
  created_at: Date;
  updated_at: Date;
}

interface CreateUserInput {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  passwordSalt: string;
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserRepository {
  async create(input: CreateUserInput, client?: import('pg').PoolClient): Promise<UserRecord> {
    const result = await getExecutor(client).query<UserRow>(
      `INSERT INTO users (id, email, name, role, password_hash, password_salt)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.id, input.email, input.name, input.role, input.passwordHash, input.passwordSalt],
    );

    return mapUser(requireRow(result.rows, 'user insert'));
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? mapUser(result.rows[0]) : null;
  }

  async list(): Promise<UserRecord[]> {
    const result = await query<UserRow>('SELECT * FROM users ORDER BY created_at ASC');
    return result.rows.map(mapUser);
  }
}
