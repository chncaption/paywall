import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { pool } from './pool';

async function migrate(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const alreadyApplied = await pool.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file]);
    if (alreadyApplied.rowCount) {
      continue;
    }

    const migrationPath = path.join(migrationsDir, file);
    const sql = await import('node:fs/promises').then((fs) => fs.readFile(migrationPath, 'utf8'));

    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations(version) VALUES ($1)', [file]);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}

migrate()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exitCode = 1;
  });
