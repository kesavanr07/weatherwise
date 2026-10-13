import { AppError, ErrorCodes } from '../error.handler.js';

describe('AppError', () => {
  it('keeps a public message and hides the provider cause', () => {
    const error = AppError.weatherUnavailable(new Error('socket hang up'));
    const response = error.toClientResponse({ path: ['activitySuitability'] });

    expect(response).toEqual({
      message: 'Weather data is temporarily unavailable. Try again later.',
      path: ['activitySuitability'],
      locations: undefined,
      extensions: { code: ErrorCodes.WEATHER_UNAVAILABLE },
    });
    expect(JSON.stringify(response)).not.toContain('socket hang up');
  });

  it('maps schema failures and unknown errors to stable codes', () => {
    expect(AppError.from(new Error('db locked'), 'GRAPHQL_VALIDATION_FAILED').code).toBe(
      ErrorCodes.INVALID_QUERY,
    );
    expect(AppError.from(new Error('db locked')).code).toBe(ErrorCodes.INTERNAL_ERROR);
    expect(AppError.from(new Error('db locked')).message).toBe(
      'Something went wrong. Try again later.',
    );
    expect(AppError.from(new Error('csrf'), 'BAD_REQUEST')).toMatchObject({
      code: ErrorCodes.INVALID_REQUEST,
      shouldLog: false,
    });
  });
});
