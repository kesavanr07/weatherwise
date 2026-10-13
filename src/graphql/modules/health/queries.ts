import type { WeatherService } from '../../../services/weather.service.js';

export const healthResolvers = {
  Query: {
    /**
    Return the service health status.
    @param _root GraphQL root value.
    @param _arguments GraphQL field arguments.
    @param context Resolver context containing the service.
    @param context.service Weather service instance.
    @returns Health status text.
    */
    health: (_root: unknown, _arguments: unknown, context: { service: WeatherService }): string =>
      context.service.healthCheck(),
  },
};
