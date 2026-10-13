import type { ResolvedLocation } from './location.interface.js';

export interface DailyWeatherEntry {
  date: string;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbabilityMax: number | null;
  precipitationSum: number | null;
  windSpeedMax: number | null;
  snowfallSum: number | null;
  sunrise: string | null;
  sunset: string | null;
  waveHeightMax: number | null;
  wavePeriodMax: number | null;
}

export interface ForecastSnapshot {
  location: ResolvedLocation;
  timezone: string;
  fetchedAt: string;
  daily: DailyWeatherEntry[];
  warnings: string[];
  provider: 'open-meteo';
}

export interface DataFreshness {
  fetchedAt: string;
  cacheAgeSeconds: number;
  isStale: boolean;
  expiresAt: string;
}

export interface SearchLocationInput {
  location: string;
  country?: string | null;
  refresh?: boolean | null;
}
