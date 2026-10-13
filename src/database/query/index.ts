import { readFileSync } from 'node:fs';
import path from 'node:path';

const queryFile = readFileSync(
  path.resolve(process.cwd(), 'src/database/query/weather.repository.sql'),
  'utf8',
);

/**
Parse named SQL statements from a source file.
@param source SQL file contents.
@returns A map of query names to SQL statements.
*/
function parseRepositoryQueries(source: string): Record<string, string> {
  const queries: [string, string][] = [];
  let currentName: string | undefined;
  let currentSql: string[] = [];

  for (const line of source.split('\n')) {
    const header = /^-- name: (.+)$/.exec(line);
    if (header) {
      if (currentName !== undefined) queries.push([currentName, currentSql.join('\n').trim()]);
      currentName = header[1].trim();
      currentSql = [];
    } else if (currentName !== undefined) {
      currentSql.push(line);
    }
  }

  if (currentName !== undefined) queries.push([currentName, currentSql.join('\n').trim()]);
  return Object.fromEntries(queries);
}

/**
Named SQL statements loaded from the repository query file.
*/
export const repositoryQueries = parseRepositoryQueries(queryFile);
