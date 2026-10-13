import { concatAST, parse } from 'graphql';
import { activitySuitability } from './modules/activity-suitability/index.js';
import { health } from './modules/health/index.js';
import { sharedTypeDefs } from './shared/index.js';

export const typeDefs = concatAST([
  sharedTypeDefs,
  parse(health.typeDefs),
  parse(activitySuitability.typeDefs),
]);
export const resolvers = {
  Query: {
    ...health.resolvers.Query,
    ...activitySuitability.resolvers.Query,
  },
};
