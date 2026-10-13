import { readFileSync } from 'node:fs';
import path from 'node:path';
import { activitySuitabilityResolvers } from './queries.js';

export const activitySuitabilityTypeDefs = readFileSync(
  path.resolve(process.cwd(), 'src/graphql/modules/activity-suitability/activity.graphql'),
  'utf8',
);
export const activitySuitability = {
  typeDefs: activitySuitabilityTypeDefs,
  resolvers: activitySuitabilityResolvers,
};
