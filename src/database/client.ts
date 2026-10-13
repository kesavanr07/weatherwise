import BetterSqliteDatabase from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
Open the SQLite database and initialize its tables.
@param databasePath Path to the SQLite database file.
@returns The initialized database connection.
*/
export function openDatabase(databasePath: string): BetterSqliteDatabase.Database {
  const resolvedDatabasePath = path.resolve(databasePath);
  // The path comes from validated application configuration.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  mkdirSync(path.dirname(resolvedDatabasePath), { recursive: true });
  const database = new BetterSqliteDatabase(resolvedDatabasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  const schema = readFileSync(path.resolve(process.cwd(), 'src/database/query/schema.sql'), 'utf8');
  database.exec(schema);
  return database;
}
