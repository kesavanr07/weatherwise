import type {
  DailyWeatherEntry,
  ForecastSnapshot,
} from '../common/interfaces/weather.interface.js';
import type { ResolvedLocation } from '../common/interfaces/location.interface.js';
import type { WeatherProvider } from '../common/interfaces/weather.provider.interface.js';
import type {
  JsonRecord,
  OpenMeteoDailyData,
  OpenMeteoResponse,
} from './interfaces/open.meteo.response.interface.js';
import { environment } from '../config/environment.js';
import { AppError } from '../common/error-handler/error.handler.js';
import { toFiniteNumber } from '../common/utilities.js';

// The API model uses null to represent unavailable optional values.
// eslint-disable-next-line unicorn/no-null -- This is a GraphQL-visible absence marker.
const NO_DATA = null;

/**
Checks whether an unknown JSON value is a non-null object.
@param value - The value to check.
@returns Whether the value can be read as a JSON object.
*/
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== NO_DATA && !Array.isArray(value);
}

/**
Returns an array when a JSON value contains one.
@param value - The JSON value to inspect.
@returns The value as an array, or `undefined` when it is not an array.
*/
function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

/**
Reads the daily forecast arrays from an Open-Meteo response.
@param value - The response's daily field.
@returns A typed daily response, or `undefined` when the value is not an object.
*/
function readDailyData(value: unknown): OpenMeteoDailyData | undefined {
  if (!isRecord(value)) return undefined;

  return {
    time: asArray(value.time),
    weather_code: asArray(value.weather_code),
    temperature_2m_max: asArray(value.temperature_2m_max),
    temperature_2m_min: asArray(value.temperature_2m_min),
    precipitation_probability_max: asArray(value.precipitation_probability_max),
    precipitation_sum: asArray(value.precipitation_sum),
    wind_speed_10m_max: asArray(value.wind_speed_10m_max),
    snowfall_sum: asArray(value.snowfall_sum),
    sunrise: asArray(value.sunrise),
    sunset: asArray(value.sunset),
    wave_height_max: asArray(value.wave_height_max),
    wave_period_max: asArray(value.wave_period_max),
  };
}

/**
Validates the top-level JSON response shape before reading provider fields.
@param value - The JSON value returned by fetch.
@returns A response with only recognized top-level fields.
*/
function readResponse(value: unknown): OpenMeteoResponse {
  if (!isRecord(value)) return {};
  return {
    results: value.results,
    daily: readDailyData(value.daily),
    timezone: value.timezone,
  };
}

/**
Returns a non-empty string value, or a fallback for other JSON values.
@param value - The value to convert.
@param fallback - The string used when the value is not usable text.
@returns The usable string or fallback.
*/
function textValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/**
Converts an optional JSON text field to a nullable string.
@param value - The value to inspect.
@returns The text value, or the unavailable marker.
*/
function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : NO_DATA;
}

/**
Reads a forecast array item without unsafe indexed access.
@param values - The optional forecast series.
@param index - The forecast day index.
@returns The item at the requested position.
*/
function arrayValue(values: unknown[] | undefined, index: number): unknown {
  return values?.at(index);
}

/**
Converts an optional provider time value to a string.
@param value - The provider value to inspect.
@returns The string value, or the unavailable marker.
*/
function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : NO_DATA;
}

/**
Requests JSON from an Open-Meteo endpoint and validates its response shape.
@param url - The endpoint URL to request.
@param timeoutMs - Maximum request duration in milliseconds.
@returns The validated Open-Meteo response.
*/
async function fetchJson(url: URL, timeoutMs: number): Promise<OpenMeteoResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw AppError.weatherUnavailable(
        new Error(`Open-Meteo request failed with HTTP ${String(response.status)}.`),
      );
    }

    const json: unknown = await response.json();
    return readResponse(json);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.weatherUnavailable(error);
  } finally {
    clearTimeout(timeout);
  }
}

/**
Retrieves geocoding and forecast data from Open-Meteo.
*/
export class OpenMeteoProvider implements WeatherProvider {
  /**
  Creates a provider with a request timeout.
  @param timeoutMs - Maximum request duration in milliseconds.
  */
  constructor(private readonly timeoutMs: number = environment.REQUEST_TIMEOUT_MS) {}

  /**
  Finds matching locations by name and optional country.
  @param location - The city or town to search for.
  @param country - An optional country name or ISO code.
  @returns Matching locations with usable coordinates.
  */
  async searchLocation(location: string, country?: string | null): Promise<ResolvedLocation[]> {
    const query = location.trim();
    if (!query) {
      throw AppError.invalidInput('Location cannot be blank.');
    }

    const url = new URL(environment.OPEN_METEO_GEOCODING_URL);
    const normalizedCountry = country?.trim().toLowerCase();
    url.searchParams.set(
      'name',
      normalizedCountry !== undefined && !/^[a-z]{2}$/i.test(normalizedCountry)
        ? `${query}, ${normalizedCountry}`
        : query,
    );
    if (normalizedCountry !== undefined && /^[a-z]{2}$/i.test(normalizedCountry)) {
      url.searchParams.set('countryCode', normalizedCountry.toUpperCase());
    }
    url.searchParams.set('count', String(environment.OPEN_METEO_GEOCODING_COUNT));
    url.searchParams.set('language', environment.OPEN_METEO_LANGUAGE);
    url.searchParams.set('format', 'json');

    const data = await fetchJson(url, this.timeoutMs);
    const results = Array.isArray(data.results) ? data.results.filter(isRecord) : [];
    const mapped: ResolvedLocation[] = results.map((entry): ResolvedLocation => {
      const latitude = toFiniteNumber(entry.latitude) ?? 0;
      const longitude = toFiniteNumber(entry.longitude) ?? 0;
      return {
        id:
          typeof entry.id === 'string' || typeof entry.id === 'number'
            ? String(entry.id)
            : `${String(latitude)}-${String(longitude)}`,
        name: textValue(entry.name, query),
        country: textValue(entry.country, 'Unknown'),
        countryCode: nullableText(entry.country_code),
        latitude,
        longitude,
        timezone: textValue(entry.timezone, 'UTC'),
        admin1: nullableText(entry.admin1),
      };
    });

    if (country === undefined || country === NO_DATA || country.trim().length === 0) {
      return mapped.filter(
        (candidate: ResolvedLocation) =>
          Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude),
      );
    }

    const matching = mapped.filter((candidate: ResolvedLocation) => {
      const isCountryMatch = [candidate.country, candidate.countryCode].some(
        (value) => value?.toLowerCase() === normalizedCountry,
      );
      const isAdminMatch = candidate.admin1?.toLowerCase() === normalizedCountry;
      return isCountryMatch || isAdminMatch;
    });

    return matching;
  }

  /**
  Fetches and combines weather and marine forecasts for a location.
  @param location - The resolved location to forecast.
  @returns The normalized forecast snapshot and any data warnings.
  */
  async fetchForecast(location: ResolvedLocation): Promise<ForecastSnapshot> {
    const weatherUrl = new URL(environment.OPEN_METEO_FORECAST_URL);
    weatherUrl.searchParams.set('latitude', String(location.latitude));
    weatherUrl.searchParams.set('longitude', String(location.longitude));
    weatherUrl.searchParams.set(
      'daily',
      [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_probability_max',
        'precipitation_sum',
        'wind_speed_10m_max',
        'snowfall_sum',
        'sunrise',
        'sunset',
      ].join(','),
    );
    weatherUrl.searchParams.set('forecast_days', String(environment.OPEN_METEO_FORECAST_DAYS));
    weatherUrl.searchParams.set('timezone', environment.OPEN_METEO_TIMEZONE);

    const marineUrl = new URL(environment.OPEN_METEO_MARINE_URL);
    marineUrl.searchParams.set('latitude', String(location.latitude));
    marineUrl.searchParams.set('longitude', String(location.longitude));
    marineUrl.searchParams.set('daily', ['wave_height_max', 'wave_period_max'].join(','));
    marineUrl.searchParams.set('forecast_days', String(environment.OPEN_METEO_FORECAST_DAYS));
    marineUrl.searchParams.set('timezone', environment.OPEN_METEO_TIMEZONE);

    const marineRequest = (async (): Promise<OpenMeteoResponse | undefined> => {
      try {
        return await fetchJson(marineUrl, this.timeoutMs);
      } catch {
        return undefined;
      }
    })();
    const [weatherData, marineData] = await Promise.all([
      fetchJson(weatherUrl, this.timeoutMs),
      marineRequest,
    ]);

    const weatherDaily = weatherData.daily;
    const weatherTimes = weatherDaily?.time;
    if (weatherTimes === undefined) {
      throw AppError.weatherUnavailable(
        new Error('Open-Meteo forecast response was missing the daily time series.'),
      );
    }

    const marineDaily = marineData?.daily;
    const marineDates = marineDaily?.time ?? [];
    const marineByDate = new Map<
      string,
      { waveHeightMax: number | null; wavePeriodMax: number | null }
    >();
    for (const [index, date] of marineDates.entries()) {
      if (typeof date === 'string') {
        marineByDate.set(date, {
          waveHeightMax: toFiniteNumber(arrayValue(marineDaily?.wave_height_max, index)),
          wavePeriodMax: toFiniteNumber(arrayValue(marineDaily?.wave_period_max, index)),
        });
      }
    }

    const daily: DailyWeatherEntry[] = weatherTimes.map((date, index) => {
      if (typeof date !== 'string') {
        throw AppError.weatherUnavailable(
          new Error('Open-Meteo forecast response included an invalid daily date.'),
        );
      }
      return {
        date,
        weatherCode: toFiniteNumber(arrayValue(weatherDaily?.weather_code, index)),
        temperatureMax: toFiniteNumber(arrayValue(weatherDaily?.temperature_2m_max, index)),
        temperatureMin: toFiniteNumber(arrayValue(weatherDaily?.temperature_2m_min, index)),
        precipitationProbabilityMax: toFiniteNumber(
          arrayValue(weatherDaily?.precipitation_probability_max, index),
        ),
        precipitationSum: toFiniteNumber(arrayValue(weatherDaily?.precipitation_sum, index)),
        windSpeedMax: toFiniteNumber(arrayValue(weatherDaily?.wind_speed_10m_max, index)),
        snowfallSum: toFiniteNumber(arrayValue(weatherDaily?.snowfall_sum, index)),
        sunrise: stringValue(arrayValue(weatherDaily?.sunrise, index)),
        sunset: stringValue(arrayValue(weatherDaily?.sunset, index)),
        waveHeightMax: marineByDate.get(date)?.waveHeightMax ?? NO_DATA,
        wavePeriodMax: marineByDate.get(date)?.wavePeriodMax ?? NO_DATA,
      };
    });

    const warnings = [] as string[];
    if (
      !marineData ||
      marineDaily?.wave_height_max === undefined ||
      marineDaily.wave_period_max === undefined
    ) {
      warnings.push(
        'Surfing suitability is unavailable because marine wave data could not be fetched for this location.',
      );
    }

    return {
      location,
      timezone: textValue(weatherData.timezone, location.timezone),
      fetchedAt: new Date().toISOString(),
      daily,
      warnings,
      provider: 'open-meteo',
    };
  }
}
