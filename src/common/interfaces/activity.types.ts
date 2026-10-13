import type { DailyWeatherEntry, DataFreshness } from './weather.interface.js';

export type ActivityType = 'SKIING' | 'SURFING' | 'OUTDOOR_SIGHTSEEING' | 'INDOOR_SIGHTSEEING';

export interface ActivityDayScore {
  date: string;
  score: number | null;
  explanation: string;
}

export interface RankedActivity {
  activity: ActivityType;
  bestDay: ActivityDayScore | null;
  rankedDays: ActivityDayScore[];
  missingData: boolean;
}

export interface ActivitySuitabilityResult {
  location: {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  forecast: DailyWeatherEntry[];
  activities: RankedActivity[];
  dataFreshness: DataFreshness;
  warnings: string[];
}
