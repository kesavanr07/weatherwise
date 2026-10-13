import type Sqlite from 'better-sqlite3';
import type { ForecastSnapshot } from '../../common/interfaces/weather.interface.js';
import type { ResolvedLocation } from '../../common/interfaces/location.interface.js';
import type {
  DailyForecastRow,
  LocationRow,
  SnapshotRow,
  StoredLocation,
  StoredSnapshot,
} from './interfaces/weather.records.interface.js';
import { repositoryQueries } from '../query/index.js';

// better-sqlite3 uses JavaScript null to bind SQL NULL.
// eslint-disable-next-line unicorn/no-null -- The query uses SQL NULL for optional filters.
const SQL_NULL = null;

/**
Converts a database snapshot row to the public repository shape.
@param row - The raw snapshot row returned by SQLite.
@returns The normalized stored snapshot.
*/
function normalizeSnapshotRow(row: SnapshotRow): StoredSnapshot {
  return {
    id: row.id,
    locationId: row.location_id,
    fetchedAt: row.fetched_at,
    timezone: row.timezone,
    warnings: row.warnings,
    provider: row.provider,
    isFresh: row.is_fresh ?? 0,
    isStale: row.is_stale ?? 0,
    expiresAt: row.expires_at,
  };
}

/**
Inserts every daily forecast row for a stored snapshot.
@param database - The SQLite database connection.
@param snapshotId - The stored snapshot identifier.
@param daily - The forecast days to insert.
*/
function insertForecastDays(
  database: Sqlite.Database,
  snapshotId: number,
  daily: ForecastSnapshot['daily'],
): void {
  const insert = database.prepare<unknown[], unknown[]>(repositoryQueries.insertDailyForecast);
  for (const day of daily) {
    insert.run(
      snapshotId,
      day.date,
      day.weatherCode,
      day.temperatureMax,
      day.temperatureMin,
      day.precipitationProbabilityMax,
      day.precipitationSum,
      day.windSpeedMax,
      day.snowfallSum,
      day.sunrise,
      day.sunset,
      day.waveHeightMax,
      day.wavePeriodMax,
    );
  }
}

/**
Provides typed access to weather locations and forecast snapshots in SQLite.
*/
export class WeatherRepository {
  /**
  Creates a repository backed by the application database.
  @param database - The SQLite database connection.
  */
  constructor(private readonly database: Sqlite.Database) {}

  /**
  Finds stored locations matching a name and optional country.
  @param name - The city or town name to search for.
  @param country - An optional country name or code.
  @returns Matching stored locations ordered by name and country.
  */
  findLocationsByName(name: string, country?: string | null): StoredLocation[] {
    const rows = this.database
      .prepare<unknown[], LocationRow>(repositoryQueries.findLocationsByName)
      .all(
        name.trim(),
        country ?? SQL_NULL,
        country?.trim() ?? SQL_NULL,
        country?.trim() ?? SQL_NULL,
      );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      country: row.country,
      countryCode: row.country_code,
      latitude: row.latitude,
      longitude: row.longitude,
      timezone: row.timezone,
      admin1: row.admin1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
  Creates or updates the stored location at the given coordinates.
  @param location - The resolved location returned by the weather provider.
  @returns The inserted or updated location.
  */
  upsertLocation(location: ResolvedLocation): StoredLocation {
    const now = new Date().toISOString();
    const existing = this.database
      .prepare<unknown[], LocationRow>(repositoryQueries.findLocationByCoordinates)
      .get(location.latitude, location.longitude, location.country);

    if (existing) {
      this.database
        .prepare<unknown[], unknown[]>(repositoryQueries.updateLocation)
        .run(
          location.name,
          location.country,
          location.countryCode ?? SQL_NULL,
          location.timezone,
          location.admin1 ?? SQL_NULL,
          now,
          existing.id,
        );
      return {
        id: existing.id,
        name: location.name,
        country: location.country,
        countryCode: location.countryCode ?? existing.country_code,
        latitude: existing.latitude,
        longitude: existing.longitude,
        timezone: location.timezone,
        admin1: location.admin1 ?? SQL_NULL,
        createdAt: existing.created_at,
        updatedAt: now,
      };
    }

    const result = this.database
      .prepare<unknown[], unknown[]>(repositoryQueries.insertLocation)
      .run(
        location.name,
        location.country,
        location.countryCode ?? SQL_NULL,
        location.latitude,
        location.longitude,
        location.timezone,
        location.admin1 ?? SQL_NULL,
        now,
        now,
      );

    return {
      id: Number(result.lastInsertRowid),
      name: location.name,
      country: location.country,
      countryCode: location.countryCode ?? SQL_NULL,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      admin1: location.admin1 ?? SQL_NULL,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
  Finds the most recently updated location at the given coordinates.
  @param latitude - The location latitude.
  @param longitude - The location longitude.
  @returns The matching location, or `null` when no row exists.
  */
  getLocationByCoordinates(latitude: number, longitude: number): StoredLocation | undefined {
    const row = this.database
      .prepare<unknown[], LocationRow>(repositoryQueries.getLocationByCoordinates)
      .get(latitude, longitude);

    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      country: row.country,
      countryCode: row.country_code,
      latitude: row.latitude,
      longitude: row.longitude,
      timezone: row.timezone,
      admin1: row.admin1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
  Loads the newest forecast snapshot for a location.
  @param locationId - The stored location identifier.
  @returns The latest snapshot, or `undefined` when no snapshot exists.
  */
  getLatestSnapshot(locationId: number): StoredSnapshot | undefined {
    const row = this.database
      .prepare<unknown[], SnapshotRow>(repositoryQueries.getLatestSnapshot)
      .get(locationId);

    return row ? normalizeSnapshotRow(row) : undefined;
  }

  /**
  Saves a forecast snapshot and all of its daily forecasts atomically.
  @param locationId - The stored location identifier.
  @param snapshot - The forecast data to persist.
  @param expiresAt - The timestamp when the snapshot becomes stale.
  @returns The identifier assigned to the new snapshot.
  */
  createSnapshot(locationId: number, snapshot: ForecastSnapshot, expiresAt: string): number {
    return this.database.transaction(() => {
      const statement = this.database.prepare<unknown[], unknown[]>(
        repositoryQueries.insertSnapshot,
      );

      const result = statement.run(
        locationId,
        snapshot.fetchedAt,
        snapshot.timezone,
        JSON.stringify(snapshot.warnings),
        snapshot.provider,
        expiresAt,
        new Date().toISOString(),
      );

      const snapshotId = Number(result.lastInsertRowid);
      insertForecastDays(this.database, snapshotId, snapshot.daily);
      return snapshotId;
    })();
  }

  /**
  Loads and maps daily forecasts belonging to a snapshot.
  @param snapshotId - The stored snapshot identifier.
  @returns The snapshot's daily forecast entries.
  */
  getSnapshotDailyForecasts(snapshotId: number): ForecastSnapshot['daily'] {
    const rows = this.database
      .prepare<unknown[], DailyForecastRow>(repositoryQueries.getSnapshotDailyForecasts)
      .all(snapshotId);

    return rows.map((row) => ({
      date: row.date,
      weatherCode: row.weather_code,
      temperatureMax: row.temperature_max,
      temperatureMin: row.temperature_min,
      precipitationProbabilityMax: row.precipitation_probability_max,
      precipitationSum: row.precipitation_sum,
      windSpeedMax: row.wind_speed_max,
      snowfallSum: row.snowfall_sum,
      sunrise: row.sunrise,
      sunset: row.sunset,
      waveHeightMax: row.wave_height_max,
      wavePeriodMax: row.wave_period_max,
    }));
  }

  /**
  Loads the latest snapshot and its associated forecast data.
  @param locationId - The stored location identifier.
  @returns The snapshot data, or `null` when no snapshot exists.
  */
  getSnapshotData(
    locationId: number,
  ):
    { snapshot: StoredSnapshot; daily: ForecastSnapshot['daily']; warnings: string[] } | undefined {
    const snapshot = this.getLatestSnapshot(locationId);
    if (!snapshot) return undefined;

    const daily = this.getSnapshotDailyForecasts(snapshot.id);
    const warnings = JSON.parse(snapshot.warnings || '[]') as string[];
    return { snapshot, daily, warnings };
  }
}
