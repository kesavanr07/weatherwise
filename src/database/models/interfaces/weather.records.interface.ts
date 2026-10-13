import type { ResolvedLocation } from '../../../common/interfaces/location.interface.js';

export interface StoredLocation extends ResolvedLocation {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSnapshot {
  id: number;
  locationId: number;
  fetchedAt: string;
  timezone: string;
  warnings: string;
  provider: string;
  isFresh: number;
  isStale: number;
  expiresAt: string;
}

export interface LocationRow {
  id: number;
  name: string;
  country: string;
  country_code: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1: string | null;
  created_at: string;
  updated_at: string;
}

export interface SnapshotRow {
  id: number;
  location_id: number;
  fetched_at: string;
  timezone: string;
  warnings: string;
  provider: string;
  is_fresh?: number | null;
  is_stale?: number | null;
  expires_at: string;
}

export interface DailyForecastRow {
  date: string;
  weather_code: number | null;
  temperature_max: number | null;
  temperature_min: number | null;
  precipitation_probability_max: number | null;
  precipitation_sum: number | null;
  wind_speed_max: number | null;
  snowfall_sum: number | null;
  sunrise: string | null;
  sunset: string | null;
  wave_height_max: number | null;
  wave_period_max: number | null;
}
