#!/usr/bin/env tsx
/**
 * Local database backup script.
 *
 * Usage (from repo root, by an operator with DB access):
 *   tsx scripts/backup-database.ts
 *
 * This script is intentionally not exposed through any HTTP route.
 */

import { execSync } from 'node:child_process';
import { env } from '../src/config';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = `backups/paywall-${timestamp}.sql`;

// pg_dump is part of the operator's local toolchain; the URL comes from env.
execSync(`pg_dump "${env.DATABASE_URL}" > ${outputFile}`, { stdio: 'inherit' });

console.log(`Backup written to ${outputFile}`);
