import { environment } from '../config/environment.js';
import type {
  ActivitySuitabilityResult,
  ActivityType,
} from '../common/interfaces/activity.types.js';
import type {
  DailyWeatherEntry,
  SearchLocationInput,
} from '../common/interfaces/weather.interface.js';
import { rankActivityDays } from './ranking/activity.ranking.helper.service.js';
import { AppError } from '../common/error-handler/error.handler.js';
import type { WeatherServiceDependencies } from './interfaces/weather.service.interface.js';

/** Return the current time for cache operations.
@returns Current wall clock time.
*/
function systemClock(): Date {
  return new Date();
}

/**
Coordinates location lookup, forecast caching, and activity ranking.
*/
export class WeatherService {
  private readonly inFlightRefreshes = new Map<string, Promise<ActivitySuitabilityResult>>();

  /**
  Create a service with its provider, repository, and cache settings.
  @param dependencies Provider, repository, and optional cache settings.
  */
  constructor(private readonly dependencies: WeatherServiceDependencies) {
    this.dependencies.clock ??= systemClock;
    this.dependencies.cacheTtlSeconds ??= environment.CACHE_TTL_SECONDS;
    this.dependencies.staleMaxAgeSeconds ??= environment.STALE_MAX_AGE_SECONDS;
  }

  /** Refresh and persist the forecast, then build the API result.
  @param location Resolved location to refresh.
  @param location.id Saved location identifier.
  @param location.name Location name.
  @param location.country Country name.
  @param location.latitude Latitude.
  @param location.longitude Longitude.
  @param location.timezone Time zone identifier.
  @returns The saved forecast and activity rankings.
  */
  private async refreshAndReturn(location: {
    id: number;
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }): Promise<ActivitySuitabilityResult> {
    const fetched = await this.dependencies.provider.fetchForecast({
      name: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    });

    const savedLocation = this.dependencies.repository.upsertLocation(fetched.location);
    const now = this.dependencies.clock?.() ?? new Date();
    const cacheTtlSeconds = this.dependencies.cacheTtlSeconds ?? environment.CACHE_TTL_SECONDS;
    const expiresAt = new Date(now.getTime() + cacheTtlSeconds * 1000).toISOString();
    this.dependencies.repository.createSnapshot(savedLocation.id, fetched, expiresAt);
    const snapshot = this.dependencies.repository.getSnapshotData(savedLocation.id);
    if (!snapshot) {
      throw AppError.internal(
        new Error(
          'The provider response was fetched, but the snapshot could not be read back from storage.',
        ),
      );
    }

    return this.buildResult(
      savedLocation,
      snapshot.daily,
      snapshot.warnings,
      snapshot.snapshot.fetchedAt,
      snapshot.snapshot.expiresAt,
    );
  }

  /** Resolve a query from stored locations or the weather provider.
  @param location User supplied location name.
  @param country Optional country filter.
  @returns The best matching location.
  */
  private async resolveLocation(
    location: string,
    country?: string | null,
  ): Promise<{
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
    admin1?: string | null;
    countryCode?: string | null;
  }> {
    const known = this.dependencies.repository.findLocationsByName(location, country);
    if (known.length === 1) return known[0];
    if (known.length > 1) {
      const countryDetail =
        typeof country === 'string' && country.length > 0 ? ` in ${country}` : '';
      throw AppError.locationAmbiguous(
        `Multiple places match "${location}"${countryDetail}. Please provide a more specific location.`,
      );
    }

    const results = await this.dependencies.provider.searchLocation(location, country);
    if (results.length === 0) {
      throw AppError.locationNotFound(`No location matched "${location}".`);
    }

    const best = this.chooseLocation(location, country, results);
    return {
      name: best.name,
      country: best.country,
      latitude: best.latitude,
      longitude: best.longitude,
      timezone: best.timezone,
      admin1: best.admin1,
      countryCode: best.countryCode,
    };
  }

  /** Choose an exact result or reject ambiguous matches.
  @param location User supplied location name.
  @param country Optional country filter.
  @param results Provider search results.
  @returns The uniquely matching location.
  */
  private chooseLocation(
    location: string,
    country: string | null | undefined,
    results: {
      name: string;
      country: string;
      latitude: number;
      longitude: number;
      timezone: string;
      admin1?: string | null;
      countryCode?: string | null;
    }[],
  ): (typeof results)[number] {
    const firstResult = results[0];
    if (results.length === 1) return firstResult;

    const normalized = location.trim().toLowerCase();
    const exact = results.filter((candidate) => candidate.name.trim().toLowerCase() === normalized);
    const exactResult = exact[0];
    if (exact.length === 1) return exactResult;

    const countryDetail = typeof country === 'string' && country.length > 0 ? ` in ${country}` : '';
    throw AppError.locationAmbiguous(
      `Multiple places match "${location}"${countryDetail}. Please provide a more specific location.`,
    );
  }

  /** Check whether a stored forecast is within its validity window.
  @param fetchedAt Fetch timestamp.
  @param expiresAt Expiration timestamp.
  @returns Whether the forecast is currently fresh.
  */
  private isFresh(fetchedAt: string, expiresAt: string): boolean {
    const now = (this.dependencies.clock?.() ?? new Date()).getTime();
    const fetchedMs = new Date(fetchedAt).getTime();
    const expiryMs = new Date(expiresAt).getTime();
    return now <= expiryMs && now >= fetchedMs;
  }

  /** Check whether stale forecast data is recent enough to serve.
  @param fetchedAt Fetch timestamp.
  @returns Whether stale data remains inside the configured limit.
  */
  private canServeStale(fetchedAt: string): boolean {
    const now = (this.dependencies.clock?.() ?? new Date()).getTime();
    const ageSeconds = (now - new Date(fetchedAt).getTime()) / 1000;
    const staleMaxAgeSeconds =
      this.dependencies.staleMaxAgeSeconds ?? environment.STALE_MAX_AGE_SECONDS;
    return ageSeconds <= staleMaxAgeSeconds;
  }

  /** Assemble API data and derive activity rankings and freshness.
  @param location Forecast location.
  @param location.name Forecast location name.
  @param location.country Country name.
  @param location.latitude Latitude.
  @param location.longitude Longitude.
  @param location.timezone Time zone identifier.
  @param daily Forecast entries.
  @param warnings Provider or cache warnings.
  @param fetchedAt Fetch timestamp.
  @param expiresAt Expiration timestamp.
  @returns The complete activity suitability response.
  */
  private buildResult(
    location: {
      name: string;
      country: string;
      latitude: number;
      longitude: number;
      timezone: string;
    },
    daily: DailyWeatherEntry[],
    warnings: string[],
    fetchedAt: string,
    expiresAt: string,
  ): ActivitySuitabilityResult {
    const activityNames: ActivityType[] = [
      'SKIING',
      'SURFING',
      'OUTDOOR_SIGHTSEEING',
      'INDOOR_SIGHTSEEING',
    ];

    const activities = activityNames.map((activity) => {
      const ranking = rankActivityDays(activity, daily);
      return {
        activity,
        bestDay: ranking.bestDay,
        rankedDays: ranking.rankedDays,
        missingData: ranking.missingData,
      };
    });

    const now = (this.dependencies.clock?.() ?? new Date()).getTime();
    const cacheAgeSeconds = Math.max(0, Math.round((now - new Date(fetchedAt).getTime()) / 1000));
    const cacheTtlSeconds = this.dependencies.cacheTtlSeconds ?? environment.CACHE_TTL_SECONDS;
    const isStale = cacheAgeSeconds > cacheTtlSeconds;

    return {
      location: {
        name: location.name,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone,
      },
      forecast: daily,
      activities,
      dataFreshness: { fetchedAt, cacheAgeSeconds, isStale, expiresAt },
      warnings,
    };
  }

  /** Return the service health status.
  @returns The literal health status.
  */
  healthCheck(): string {
    return 'ok';
  }

  /** Find a location and return its cached or refreshed activity forecast.
  @param input Location search and refresh options.
  @param input.location Location to search.
  @param input.country Optional country filter.
  @param input.refresh Whether to bypass the cache.
  @returns Suitability rankings and forecast data.
  */
  async getActivitySuitability({
    location,
    country,
    refresh = false,
  }: SearchLocationInput): Promise<ActivitySuitabilityResult> {
    if (!location.trim() || location.trim().length > 120) {
      throw AppError.invalidInput(
        'Location must be a non-empty string with a maximum length of 120 characters.',
      );
    }

    const resolvedLocation = await this.resolveLocation(location, country);
    const savedLocation = this.dependencies.repository.upsertLocation(resolvedLocation);
    const cacheKey = `${String(savedLocation.latitude)}:${String(savedLocation.longitude)}`;

    const existing = this.dependencies.repository.getSnapshotData(savedLocation.id);
    if (
      refresh !== true &&
      existing !== undefined &&
      this.isFresh(existing.snapshot.fetchedAt, existing.snapshot.expiresAt)
    ) {
      return this.buildResult(
        savedLocation,
        existing.daily,
        existing.warnings,
        existing.snapshot.fetchedAt,
        existing.snapshot.expiresAt,
      );
    }

    if (this.inFlightRefreshes.has(cacheKey)) {
      const inFlightRefresh = this.inFlightRefreshes.get(cacheKey);
      if (inFlightRefresh) return inFlightRefresh;
    }

    const refreshPromise = this.refreshAndReturn(savedLocation);

    this.inFlightRefreshes.set(cacheKey, refreshPromise);

    try {
      try {
        return await refreshPromise;
      } catch (error: unknown) {
        if (existing !== undefined && this.canServeStale(existing.snapshot.fetchedAt)) {
          return this.buildResult(
            savedLocation,
            existing.daily,
            [
              ...existing.warnings,
              'A newer forecast could not be loaded, so the last saved forecast is being used.',
            ],
            existing.snapshot.fetchedAt,
            existing.snapshot.expiresAt,
          );
        }
        throw error;
      }
    } finally {
      this.inFlightRefreshes.delete(cacheKey);
    }
  }
}
