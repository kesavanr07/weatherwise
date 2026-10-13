export interface OpenMeteoDailyData {
  time?: unknown[];
  weather_code?: unknown[];
  temperature_2m_max?: unknown[];
  temperature_2m_min?: unknown[];
  precipitation_probability_max?: unknown[];
  precipitation_sum?: unknown[];
  wind_speed_10m_max?: unknown[];
  snowfall_sum?: unknown[];
  sunrise?: unknown[];
  sunset?: unknown[];
  wave_height_max?: unknown[];
  wave_period_max?: unknown[];
}

export interface OpenMeteoResponse {
  results?: unknown;
  daily?: OpenMeteoDailyData;
  timezone?: unknown;
}

export type JsonRecord = Record<string, unknown>;
