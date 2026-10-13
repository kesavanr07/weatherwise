import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WeatherService } from '../weather.service.js';
import type {
  DailyWeatherEntry,
  ForecastSnapshot,
} from '../../common/interfaces/weather.interface.js';
import type { ResolvedLocation } from '../../common/interfaces/location.interface.js';
import { openDatabase } from '../../database/client.js';
import { WeatherRepository } from '../../database/models/weather.repository.js';
import type { WeatherProvider } from '../../common/interfaces/weather.provider.interface.js';

const FETCHED_AT = '2026-10-10T00:00:00.000Z';
const LOCATION_NAME = 'Zurich';
const LOCATION_TIMEZONE = 'Europe/Zurich';
const TEST_NOW = '2026-10-10T12:00:00.000Z';
const INDIA = 'India';
const INDIA_TIMEZONE = 'Asia/Kolkata';
// These fields deliberately use null to represent missing marine measurements.
// eslint-disable-next-line unicorn/no-null
const NO_WAVE_DATA = null;

/** Build a complete seven-day forecast snapshot for service tests.
@returns A forecast captured at the fixed test timestamp.
*/
const buildForecast = (): ForecastSnapshot => ({
  location: {
    name: LOCATION_NAME,
    country: 'Switzerland',
    latitude: 47.3769,
    longitude: 8.5417,
    timezone: LOCATION_TIMEZONE,
  },
  timezone: LOCATION_TIMEZONE,
  fetchedAt: FETCHED_AT,
  warnings: ['Surfing is unavailable because marine data is missing.'],
  provider: 'open-meteo',
  daily: Array.from({ length: 7 }, (_, index) => {
    const day = new Date(FETCHED_AT);
    day.setUTCDate(day.getUTCDate() + index);
    const iso = day.toISOString().slice(0, 10);
    return {
      date: iso,
      weatherCode: 3,
      temperatureMax: 20,
      temperatureMin: 12,
      precipitationProbabilityMax: 15,
      precipitationSum: 0,
      windSpeedMax: 12,
      snowfallSum: 2,
      sunrise: `${iso}T06:00:00`,
      sunset: `${iso}T18:00:00`,
      waveHeightMax: NO_WAVE_DATA,
      wavePeriodMax: NO_WAVE_DATA,
    } satisfies DailyWeatherEntry;
  }),
});

const temporaryDirectories = new Set<string>();

afterEach(() => {
  for (const temporaryDirectory of temporaryDirectories) {
    try {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    } catch {
      // SQLite handles can keep a file locked briefly on Windows; safe to ignore cleanup races.
    }
  }
  temporaryDirectories.clear();
});

describe('weather service location resolution', () => {
  it('uses the exact city when the provider also returns partial names', async () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'weather-exact-'));
    temporaryDirectories.add(temporaryDirectory);
    const databasePath = path.join(temporaryDirectory, 'cache.db');
    const database = openDatabase(databasePath);
    const repository = new WeatherRepository(database);
    const provider: WeatherProvider = {
      /** Search mocked place names.
      @returns Provider search matches.
      */
      searchLocation() {
        return Promise.resolve([
          {
            name: 'Chennai',
            country: INDIA,
            latitude: 13.08784,
            longitude: 80.27847,
            timezone: INDIA_TIMEZONE,
            admin1: 'Tamil Nadu',
            countryCode: 'IN',
          },
          {
            name: 'Chennaikan Koppal',
            country: INDIA,
            latitude: 12.46944,
            longitude: 76.10655,
            timezone: INDIA_TIMEZONE,
            admin1: 'Karnataka',
            countryCode: 'IN',
          },
          {
            name: 'Chennai International Airport',
            country: INDIA,
            latitude: 12.98833,
            longitude: 80.16578,
            timezone: INDIA_TIMEZONE,
            admin1: 'Tamil Nadu',
            countryCode: 'IN',
          },
        ]);
      },
      /** Return the fixed forecast for a resolved location.
      @param location Resolved location.
      @returns Forecast data for that location.
      */
      fetchForecast(location) {
        return Promise.resolve({
          ...buildForecast(),
          location,
          timezone: location.timezone,
        });
      },
    };

    const service = new WeatherService({
      provider,
      repository,
      /** Return the fixed service time.
      @returns The fixed current time.
      */
      clock: (): Date => new Date(TEST_NOW),
    });

    const result = await service.getActivitySuitability({
      location: 'Chennai',
      country: 'India',
    });

    expect(result.location.name).toBe('Chennai');
    expect(result.location.latitude).toBeCloseTo(13.08784);
    database.close();
  });
});

describe('weather service caching', () => {
  it('reuses cached data without another provider call', async () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'weather-cache-'));
    temporaryDirectories.add(temporaryDirectory);
    const databasePath = path.join(temporaryDirectory, 'cache.db');
    const database = openDatabase(databasePath);
    const repository = new WeatherRepository(database);
    const provider: WeatherProvider = {
      /** Search the requested place.
      @returns The matching city.
      */
      searchLocation() {
        return Promise.resolve([
          {
            name: LOCATION_NAME,
            country: 'Switzerland',
            latitude: 47.3769,
            longitude: 8.5417,
            timezone: LOCATION_TIMEZONE,
            admin1: LOCATION_NAME,
            countryCode: 'CH',
          } satisfies ResolvedLocation,
        ]);
      },
      /** Return the fixed forecast snapshot.
      @returns The forecast snapshot.
      */
      fetchForecast() {
        return Promise.resolve(buildForecast());
      },
    };

    let providerCalls = 0;
    const enhancedProvider: WeatherProvider = {
      /** Search using the same provider implementation.
      @returns Provider search matches.
      */
      searchLocation: (): Promise<ResolvedLocation[]> => provider.searchLocation(),
      /** Count provider forecast requests.
      @param arguments_ Provider forecast arguments.
      @returns The forecast snapshot.
      */
      fetchForecast: async (...arguments_) => {
        providerCalls += 1;
        return provider.fetchForecast(...arguments_);
      },
    };

    const service = new WeatherService({
      provider: enhancedProvider,
      repository,
      /** Return the fixed service time.
      @returns The fixed current time.
      */
      clock: (): Date => new Date(TEST_NOW),
      cacheTtlSeconds: 21_600,
      staleMaxAgeSeconds: 86_400,
    });

    const first = await service.getActivitySuitability({ location: LOCATION_NAME });
    const second = await service.getActivitySuitability({ location: LOCATION_NAME });

    expect(providerCalls).toBe(1);
    expect(first.location.name).toBe(LOCATION_NAME);
    expect(second.dataFreshness.cacheAgeSeconds).toBeGreaterThanOrEqual(0);
    expect(second.forecast).toHaveLength(7);
    database.close();
  });
});

describe('weather service stale data', () => {
  it('serves stale data when a refresh fails', async () => {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'weather-stale-'));
    temporaryDirectories.add(temporaryDirectory);
    const databasePath = path.join(temporaryDirectory, 'cache.db');
    const database = openDatabase(databasePath);
    const repository = new WeatherRepository(database);
    const forecast = buildForecast();

    let currentTime = new Date(TEST_NOW);
    const provider: WeatherProvider = {
      /** Find the saved city.
      @returns A matching city.
      */
      searchLocation() {
        return Promise.resolve([
          {
            name: LOCATION_NAME,
            country: 'Switzerland',
            latitude: 47.3769,
            longitude: 8.5417,
            timezone: LOCATION_TIMEZONE,
          } satisfies ResolvedLocation,
        ]);
      },
      /** Return the saved snapshot or reject once the data becomes stale.
      @returns The saved forecast snapshot.
      */
      fetchForecast() {
        return currentTime.getTime() > new Date(TEST_NOW).getTime()
          ? Promise.reject(new Error('upstream unavailable'))
          : Promise.resolve(forecast);
      },
    };

    const service = new WeatherService({
      provider,
      repository,
      /** Return the changing service time.
      @returns The current test time.
      */
      clock: (): Date => currentTime,
      cacheTtlSeconds: 21_600,
      staleMaxAgeSeconds: 86_400,
    });

    await service.getActivitySuitability({ location: LOCATION_NAME });
    currentTime = new Date('2026-10-10T18:30:00.000Z');

    const staleResult = await service.getActivitySuitability({ location: LOCATION_NAME });
    expect(staleResult.warnings.some((warning) => warning.includes('last saved forecast'))).toBe(
      true,
    );
    database.close();
  });
});
