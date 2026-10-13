import type { WeatherService } from '../../../services/weather.service.js';

export const activitySuitabilityResolvers = {
  Query: {
    /**
    Resolves weather suitability for the requested location.
    @param _root - The parent GraphQL resolver value.
    @param arguments_ - The activity query arguments.
    @param arguments_.location - The city or town to resolve.
    @param arguments_.country - Optional country hint.
    @param arguments_.refresh - Whether to bypass cached forecast data.
    @param context - The request context.
    @param context.service - The weather service.
    @returns The activity suitability result.
    */
    activitySuitability: (
      _root: unknown,
      arguments_: { location: string; country?: string | null; refresh?: boolean | null },
      context: { service: WeatherService },
    ): ReturnType<WeatherService['getActivitySuitability']> =>
      context.service.getActivitySuitability(arguments_),
  },
};
