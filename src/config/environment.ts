import { config as loadDotEnvironment } from 'dotenv';
import { z } from 'zod';

// The environment must be loaded before schema validation.
// eslint-disable-next-line unicorn/no-top-level-side-effects -- Load local .env values before parsing.
loadDotEnvironment();

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_PATH: z.string().default('./data/weather-cache.db'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(21_600),
  STALE_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(86_400),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OPEN_METEO_GEOCODING_URL: z.url().default('https://geocoding-api.open-meteo.com/v1/search'),
  OPEN_METEO_FORECAST_URL: z.url().default('https://api.open-meteo.com/v1/forecast'),
  OPEN_METEO_MARINE_URL: z.url().default('https://marine-api.open-meteo.com/v1/marine'),
  OPEN_METEO_FORECAST_DAYS: z.coerce.number().int().min(1).max(16).default(7),
  OPEN_METEO_GEOCODING_COUNT: z.coerce.number().int().min(1).max(100).default(10),
  OPEN_METEO_LANGUAGE: z.string().min(2).default('en'),
  OPEN_METEO_TIMEZONE: z.string().min(1).default('auto'),
});

export const environment = environmentSchema.parse(process.env);
