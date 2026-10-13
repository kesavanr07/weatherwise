import { readFileSync } from 'node:fs';
import path from 'node:path';
import { healthResolvers } from './queries.js';

export const healthTypeDefs = readFileSync(
  path.resolve(process.cwd(), 'src/graphql/modules/health/health.graphql'),
  'utf8',
);
export const health = { typeDefs: healthTypeDefs, resolvers: healthResolvers };
