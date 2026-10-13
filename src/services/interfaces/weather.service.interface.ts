import type { WeatherRepository } from '../../database/models/weather.repository.js';
import type { WeatherProvider } from '../../common/interfaces/weather.provider.interface.js';

export interface WeatherServiceDependencies {
  provider: WeatherProvider;
  repository: WeatherRepository;
  clock?: () => Date;
  cacheTtlSeconds?: number;
  staleMaxAgeSeconds?: number;
}
