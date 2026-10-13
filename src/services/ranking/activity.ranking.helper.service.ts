import type { ActivityDayScore, ActivityType } from '../../common/interfaces/activity.types.js';
import type { DailyWeatherEntry } from '../../common/interfaces/weather.interface.js';
import { clamp } from '../../common/utilities.js';

// Null scores mean the forecast lacks enough data to score an activity.
// eslint-disable-next-line unicorn/no-null -- GraphQL clients use null to distinguish unavailable scores.
const UNAVAILABLE_SCORE = null;

/**
Checks whether a weather code indicates severe conditions.
@param weatherCode - The forecast weather code.
@returns Whether the code represents severe weather.
*/
const isSevereWeather = (weatherCode: number | null): boolean => {
  return weatherCode !== null && ([95, 96, 99].includes(weatherCode) || weatherCode >= 82);
};

/**
Combines the activity prefix with weather detail sentences.
@param base - The activity-specific explanation prefix.
@param extras - Additional weather observations.
@returns The combined explanation text.
*/
const buildExplanation = (base: string, extras: string[]): string =>
  base + (extras.length > 0 ? ` ${extras.join(' ')}` : '');

/**
Returns a score result when weather data is insufficient.
@param explanation - The reason no score can be calculated.
@returns A result with the unavailable score marker.
*/
function unavailable(explanation: string): { score: number | null; explanation: string } {
  return { score: UNAVAILABLE_SCORE, explanation };
}

/**
Calculates the temperature contribution to a skiing score.
@param temperature - The day's fallback temperature.
@returns The temperature score adjustment.
*/
function skiingTemperaturePoints(temperature: number): number {
  if (temperature >= 0 && temperature <= 8) return 28;
  if (temperature >= -5 && temperature < 0) return 12;
  return temperature < -10 || temperature > 14 ? -22 : 0;
}

/**
Calculates the snowfall contribution to a skiing score.
@param snowfall - The forecast snowfall amount.
@returns The snowfall score adjustment.
*/
function skiingSnowfallPoints(snowfall: number | null): number {
  return snowfall !== null && snowfall > 0 ? Math.min(20, snowfall * 8) : 0;
}

/**
Calculates the probability contribution to a skiing score.
@param probability - The forecast precipitation probability.
@returns The probability score adjustment.
*/
function skiingProbabilityPoints(probability: number | null): number {
  if (probability === null) return 0;
  if (probability >= 70) return -22;
  return probability >= 40 ? -10 : 0;
}

/**
Calculates precipitation amount points for skiing.
@param amount - The forecast precipitation amount.
@returns The precipitation score adjustment.
*/
function skiingPrecipitationPoints(amount: number | null): number {
  if (amount === null) return 0;
  if (amount > 15) return -18;
  return amount > 5 ? -8 : 0;
}

/**
Calculates the wind contribution to a skiing score.
@param wind - The forecast maximum wind speed.
@returns The wind score adjustment.
*/
function skiingWindPoints(wind: number | null): number {
  if (wind === null) return 0;
  if (wind >= 45) return -25;
  return wind >= 30 ? -12 : 0;
}

/**
Calculates the surfing wave height adjustment.
@param height - The forecast maximum wave height.
@returns The wave height score adjustment.
*/
function surfingHeightPoints(height: number): number {
  if (height >= 0.5 && height <= 2.5) return 28;
  if (height > 2.5 && height <= 5) return 16;
  return height > 5 ? 6 : -12;
}

/**
Calculates the surfing wave period adjustment.
@param period - The forecast maximum wave period.
@returns The wave period score adjustment.
*/
function surfingPeriodPoints(period: number): number {
  if (period >= 8 && period <= 14) return 18;
  if (period >= 15) return 10;
  return period < 6 ? -15 : 0;
}

/**
Calculates the surfing wind adjustment.
@param wind - The forecast maximum wind speed.
@returns The wind score adjustment.
*/
function surfingWindPoints(wind: number | null): number {
  if (wind === null) return 0;
  if (wind <= 18) return 8;
  return wind >= 35 ? -18 : 0;
}

/**
Calculates the outdoor sightseeing temperature adjustment.
@param temperature - The day's fallback temperature.
@returns The temperature score adjustment.
*/
function outdoorTemperaturePoints(temperature: number): number {
  if (temperature >= 16 && temperature <= 28) return 30;
  if (temperature >= 10 && temperature <= 31) return 12;
  return temperature < 5 || temperature > 35 ? -20 : 0;
}

/**
Calculates the outdoor sightseeing probability adjustment.
@param probability - The maximum precipitation probability.
@returns The probability score adjustment.
*/
function outdoorProbabilityPoints(probability: number | null): number {
  if (probability === null) return 0;
  if (probability <= 25) return 18;
  if (probability >= 70) return -30;
  return probability >= 40 ? -12 : 0;
}

/**
Calculates the outdoor sightseeing precipitation adjustment.
@param amount - The forecast precipitation amount.
@returns The precipitation score adjustment.
*/
function outdoorPrecipitationPoints(amount: number | null): number {
  if (amount === null) return 0;
  if (amount <= 2) return 5;
  return amount > 10 ? -16 : 0;
}

/**
Calculates the outdoor sightseeing wind adjustment.
@param wind - The forecast maximum wind speed.
@returns The wind score adjustment.
*/
function outdoorWindPoints(wind: number | null): number {
  if (wind === null) return 0;
  if (wind <= 20) return 6;
  return wind >= 35 ? -15 : 0;
}

/**
Calculates the indoor sightseeing temperature adjustment.
@param temperature - The day's fallback temperature.
@returns The temperature score adjustment.
*/
function indoorTemperaturePoints(temperature: number): number {
  if (temperature < 5 || temperature > 32) return 20;
  return temperature >= 16 && temperature <= 28 ? -10 : 0;
}

/**
Calculates the indoor sightseeing probability adjustment.
@param probability - The maximum precipitation probability.
@returns The probability score adjustment.
*/
function indoorProbabilityPoints(probability: number | null): number {
  if (probability === null) return 0;
  if (probability >= 70) return 20;
  return probability >= 40 ? 10 : -5;
}

/**
Scores a forecast day for skiing suitability.
@param day - The forecast day to score.
@returns The skiing score and explanation.
*/
export function scoreSkiing(day: DailyWeatherEntry): { score: number | null; explanation: string } {
  if (
    day.temperatureMax === null &&
    day.temperatureMin === null &&
    day.snowfallSum === null &&
    day.precipitationSum === null
  ) {
    return {
      score: UNAVAILABLE_SCORE,
      explanation:
        'Skiing suitability is unavailable because the temperature and snowfall observations are missing.',
    };
  }

  const temporary = day.temperatureMax ?? day.temperatureMin ?? 5;
  const scoreValue = clamp(
    45 +
      skiingTemperaturePoints(temporary) +
      skiingSnowfallPoints(day.snowfallSum) +
      skiingProbabilityPoints(day.precipitationProbabilityMax) +
      skiingPrecipitationPoints(day.precipitationSum) +
      skiingWindPoints(day.windSpeedMax) +
      (isSevereWeather(day.weatherCode) ? -28 : 0),
    0,
    100,
  );
  const explanationParts: string[] = [];
  if (temporary >= 0 && temporary <= 8)
    explanationParts.push('cool temperatures favor snow conditions.');
  else if (temporary > 14 || temporary < -10)
    explanationParts.push('temperatures are outside the preferred skiing range.');
  if (day.snowfallSum !== null && day.snowfallSum > 0)
    explanationParts.push(`snowfall forecast is ${String(day.snowfallSum)} mm.`);
  if (day.windSpeedMax !== null && day.windSpeedMax >= 30)
    explanationParts.push('wind is elevated and reduces comfort.');
  if (isSevereWeather(day.weatherCode))
    explanationParts.push('severe weather is a significant risk.');

  return {
    score: scoreValue,
    explanation:
      buildExplanation('Weather-only skiing proxy: ', explanationParts) ||
      'Weather-only skiing proxy.',
  };
}

/**
Scores a forecast day for surfing suitability.
@param day - The forecast day to score.
@returns The surfing score and explanation.
*/
export function scoreSurfing(day: DailyWeatherEntry): {
  score: number | null;
  explanation: string;
} {
  if (day.waveHeightMax === null || day.wavePeriodMax === null) {
    return {
      score: UNAVAILABLE_SCORE,
      explanation:
        'Surfing suitability is unavailable because marine wave data is missing for this forecast day.',
    };
  }

  const scoreValue = clamp(
    40 +
      surfingHeightPoints(day.waveHeightMax) +
      surfingPeriodPoints(day.wavePeriodMax) +
      surfingWindPoints(day.windSpeedMax) +
      (isSevereWeather(day.weatherCode) ? -20 : 0),
    0,
    100,
  );
  const explanationParts: string[] = [];
  if (day.waveHeightMax >= 0.5 && day.waveHeightMax <= 2.5)
    explanationParts.push('wave height is in a usable range.');
  else if (day.waveHeightMax < 0.5) explanationParts.push('waves are unlikely to be surfable.');
  if (day.wavePeriodMax >= 8 && day.wavePeriodMax <= 14)
    explanationParts.push('wave period supports cleaner, rideable sets.');
  if (day.windSpeedMax !== null && day.windSpeedMax >= 35)
    explanationParts.push('wind is likely to make conditions less favorable.');

  return {
    score: scoreValue,
    explanation: buildExplanation('Surfing forecast: ', explanationParts) || 'Surfing forecast.',
  };
}

/**
Scores a forecast day for outdoor sightseeing suitability.
@param day - The forecast day to score.
@returns The outdoor sightseeing score and explanation.
*/
export function scoreOutdoorSightseeing(day: DailyWeatherEntry): {
  score: number | null;
  explanation: string;
} {
  if (
    day.temperatureMax === null &&
    day.temperatureMin === null &&
    day.precipitationProbabilityMax === null &&
    day.precipitationSum === null
  ) {
    return {
      score: UNAVAILABLE_SCORE,
      explanation:
        'Outdoor sightseeing is unavailable because weather inputs are missing for this day.',
    };
  }

  const temporary = day.temperatureMax ?? day.temperatureMin ?? 20;
  const scoreValue = clamp(
    52 +
      outdoorTemperaturePoints(temporary) +
      outdoorProbabilityPoints(day.precipitationProbabilityMax) +
      outdoorPrecipitationPoints(day.precipitationSum) +
      outdoorWindPoints(day.windSpeedMax) +
      (isSevereWeather(day.weatherCode) ? -28 : 0),
    0,
    100,
  );
  const explanationParts: string[] = [];
  if (temporary >= 16 && temporary <= 28)
    explanationParts.push('temperatures are comfortable for sightseeing.');
  if (day.precipitationProbabilityMax !== null && day.precipitationProbabilityMax <= 25)
    explanationParts.push('rain risk is low.');
  if (day.windSpeedMax !== null && day.windSpeedMax >= 35)
    explanationParts.push('wind makes outdoor plans less pleasant.');

  return {
    score: scoreValue,
    explanation:
      buildExplanation('Outdoor sightseeing: ', explanationParts) ||
      'Outdoor sightseeing forecast.',
  };
}

/**
Scores a forecast day for indoor sightseeing suitability.
@param day - The forecast day to score.
@returns The indoor sightseeing score and explanation.
*/
export function scoreIndoorSightseeing(day: DailyWeatherEntry): {
  score: number | null;
  explanation: string;
} {
  if (
    day.temperatureMax === null &&
    day.temperatureMin === null &&
    day.precipitationProbabilityMax === null &&
    day.precipitationSum === null
  ) {
    return {
      score: UNAVAILABLE_SCORE,
      explanation:
        'Indoor sightseeing is unavailable because the outdoor-weather signals are missing for this day.',
    };
  }

  const temporary = day.temperatureMax ?? day.temperatureMin ?? 20;
  const scoreValue = clamp(
    50 +
      indoorTemperaturePoints(temporary) +
      indoorProbabilityPoints(day.precipitationProbabilityMax) +
      (day.precipitationSum !== null && day.precipitationSum > 10 ? 12 : 0) +
      (day.windSpeedMax !== null && day.windSpeedMax >= 30 ? 8 : 0) +
      (isSevereWeather(day.weatherCode) ? -10 : 0),
    0,
    100,
  );
  const explanationParts: string[] = [];
  if (temporary < 5 || temporary > 32)
    explanationParts.push('extreme temperatures make outdoor plans less attractive.');
  if (day.precipitationProbabilityMax !== null && day.precipitationProbabilityMax >= 70)
    explanationParts.push('rain risk is high.');
  if (day.windSpeedMax !== null && day.windSpeedMax >= 30)
    explanationParts.push('wind reduces the value of outdoor plans.');

  return {
    score: scoreValue,
    explanation:
      buildExplanation('Indoor sightseeing: ', explanationParts) || 'Indoor sightseeing forecast.',
  };
}

/**
Scores a forecast day using the selected activity's scoring function.
@param activity - The activity to score.
@param day - The forecast day to evaluate.
@returns The activity score and explanation.
*/
function scoreDay(
  activity: ActivityType,
  day: DailyWeatherEntry,
): { score: number | null; explanation: string } {
  switch (activity) {
    case 'SKIING': {
      return scoreSkiing(day);
    }
    case 'SURFING': {
      return scoreSurfing(day);
    }
    case 'OUTDOOR_SIGHTSEEING': {
      return scoreOutdoorSightseeing(day);
    }
    case 'INDOOR_SIGHTSEEING': {
      return scoreIndoorSightseeing(day);
    }
    default: {
      return unavailable('No scorer is configured for this activity.');
    }
  }
}

/**
Ranks forecast days for the selected activity.
@param activity - The activity to rank.
@param dailyForecasts - The available daily weather data.
@returns Ranked day scores, the best day, and whether score data is missing.
*/
export function rankActivityDays(
  activity: ActivityType,
  dailyForecasts: DailyWeatherEntry[],
): { rankedDays: ActivityDayScore[]; bestDay: ActivityDayScore | null; missingData: boolean } {
  const ranked: ActivityDayScore[] = dailyForecasts
    .map((day) => {
      const result = scoreDay(activity, day);
      return {
        date: day.date,
        score: result.score,
        explanation: result.explanation,
      };
    })
    .filter((entry) => entry.score !== null);

  ranked.sort((left, right) => {
    const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
    return scoreDelta === 0 ? left.date.localeCompare(right.date) : scoreDelta;
  });

  const isMissingData = dailyForecasts.some((day) => scoreDay(activity, day).score === null);
  return {
    rankedDays: ranked,
    bestDay: ranked[0] ?? UNAVAILABLE_SCORE,
    missingData: isMissingData,
  };
}
