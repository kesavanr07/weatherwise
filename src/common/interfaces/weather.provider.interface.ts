import type { ForecastSnapshot } from './weather.interface.js';
import type { ResolvedLocation } from './location.interface.js';

export interface WeatherProvider {
  searchLocation(location: string, country?: string | null): Promise<ResolvedLocation[]>;
  fetchForecast(location: ResolvedLocation): Promise<ForecastSnapshot>;
}
