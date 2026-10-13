import type { BaseContext } from '@apollo/server';

import type { WeatherService } from '../../services/weather.service.js';

export interface RequestContext extends BaseContext {
  service: WeatherService;
}
