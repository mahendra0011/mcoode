/**
 * Database tooling helpers: SQL runner, SQLite viewer, Prisma helpers.
 */

export function executeSqlQuery(sql: string): { columns: string[]; rows: any[][] } {
  // Safe mock client runner for SQLite / SQL in browser
  return {
    columns: ['id', 'name', 'status', 'created_at'],
    rows: [
      [1, 'App Config', 'ACTIVE', '2026-09-13 12:00:00'],
      [2, 'Workspace', 'READY', '2026-09-13 12:05:00'],
      [3, 'User Session', 'AUTHENTICATED', '2026-09-13 12:10:00'],
    ],
  };
}
