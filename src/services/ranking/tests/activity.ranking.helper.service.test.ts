import type { DailyWeatherEntry } from '../../../common/interfaces/weather.interface.js';
import {
  rankActivityDays,
  scoreIndoorSightseeing,
  scoreOutdoorSightseeing,
  scoreSkiing,
  scoreSurfing,
} from '../activity.ranking.helper.service.js';

/** Build one complete forecast day for scoring tests.
@param overrides Values that differ from the baseline day.
@returns A complete daily forecast entry.
*/
const buildDay = (overrides: Partial<DailyWeatherEntry> = {}): DailyWeatherEntry => ({
  date: '2026-10-10',
  weatherCode: 3,
  temperatureMax: 22,
  temperatureMin: 14,
  precipitationProbabilityMax: 10,
  precipitationSum: 0,
  windSpeedMax: 12,
  snowfallSum: 0,
  sunrise: '2026-10-10T06:00:00',
  sunset: '2026-10-10T18:00:00',
  waveHeightMax: 1.2,
  wavePeriodMax: 10,
  ...overrides,
});

/** Return a score that a scoring test expects to be available.
@param score Nullable activity score.
@returns The numeric score.
*/
function availableScore(score: number | null): number {
  if (score === null) throw new Error('Expected an available score.');
  return score;
}

describe('activity scoring', () => {
  it('prefers cool conditions for skiing while penalizing warm and windy days', () => {
    const goodDay = buildDay({
      temperatureMax: 4,
      snowfallSum: 12,
      windSpeedMax: 18,
      precipitationProbabilityMax: 20,
    });
    const poorDay = buildDay({
      temperatureMax: 20,
      snowfallSum: 0,
      windSpeedMax: 45,
      precipitationProbabilityMax: 80,
    });

    expect(availableScore(scoreSkiing(goodDay).score)).toBeGreaterThan(
      availableScore(scoreSkiing(poorDay).score),
    );
  });

  it('returns unavailable for surfing when marine data is missing', () => {
    const missingMarine = buildDay({ waveHeightMax: undefined, wavePeriodMax: undefined });
    expect(scoreSurfing(missingMarine).score).toBeNull();
    expect(scoreSurfing(missingMarine).explanation).toContain('unavailable');
  });

  it('scores outdoor sightseeing best when precipitation and temperature are favorable', () => {
    const pleasant = buildDay({
      temperatureMax: 24,
      precipitationProbabilityMax: 10,
      windSpeedMax: 12,
    });
    const poor = buildDay({
      temperatureMax: 35,
      precipitationProbabilityMax: 80,
      windSpeedMax: 40,
    });

    expect(scoreOutdoorSightseeing(pleasant).score).toBeGreaterThan(
      availableScore(scoreOutdoorSightseeing(poor).score),
    );
  });

  it('treats indoor sightseeing as more suitable when weather is very poor outside', () => {
    const badOutside = buildDay({
      temperatureMax: 36,
      precipitationProbabilityMax: 85,
      windSpeedMax: 35,
    });
    const comfortableOutside = buildDay({
      temperatureMax: 22,
      precipitationProbabilityMax: 15,
      windSpeedMax: 12,
    });

    expect(scoreIndoorSightseeing(badOutside).score).toBeGreaterThan(
      availableScore(scoreIndoorSightseeing(comfortableOutside).score),
    );
  });

  it('ranks with deterministic date tiebreaking', () => {
    const days = [
      buildDay({ date: '2026-10-12', temperatureMax: 18, precipitationProbabilityMax: 20 }),
      buildDay({ date: '2026-10-11', temperatureMax: 18, precipitationProbabilityMax: 20 }),
    ];

    const ranking = rankActivityDays('OUTDOOR_SIGHTSEEING', days);
    expect(ranking.rankedDays[0].date).toBe('2026-10-11');
    expect(ranking.rankedDays[1].date).toBe('2026-10-12');
  });
});
