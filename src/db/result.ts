export function requireRow<T>(rows: T[], context: string): T {
  const row = rows[0];
  if (!row) {
    throw new Error(`Expected a database row for ${context}.`);
  }

  return row;
}
