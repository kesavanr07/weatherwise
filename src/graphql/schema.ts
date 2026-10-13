import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers, typeDefs } from './index.js';

export const schema = makeExecutableSchema({ typeDefs, resolvers });
