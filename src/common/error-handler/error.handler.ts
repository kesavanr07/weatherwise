import type { ClientErrorResponse, ErrorCode } from './interfaces/app.error.types.js';

export const ErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  LOCATION_NOT_FOUND: 'LOCATION_NOT_FOUND',
  LOCATION_AMBIGUOUS: 'LOCATION_AMBIGUOUS',
  INVALID_QUERY: 'INVALID_QUERY',
  INVALID_REQUEST: 'INVALID_REQUEST',
  WEATHER_UNAVAILABLE: 'WEATHER_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const satisfies Record<string, ErrorCode>;

const PUBLIC_MESSAGES = {
  weatherUnavailable: 'Weather data is temporarily unavailable. Try again later.',
  invalidQueryParse: 'The request is not a valid GraphQL query.',
  invalidQuery: 'The query does not match the API schema.',
  invalidRequest: 'Send the request as JSON with the Content-Type application/json header.',
  internal: 'Something went wrong. Try again later.',
} as const;

/**
Represents an application error with a stable public code and message.
*/
export class AppError extends Error {
  /** Creates an invalid input error.
  @param message Validation message.
  @returns An application error with the invalid input code.
  */
  static invalidInput(message: string): AppError {
    return new this(ErrorCodes.INVALID_INPUT, message);
  }

  /**
  Creates an invalid input error.
  @param message - The validation message.
  @returns An application error with the invalid input code.
  */
  /**
  Creates an application error.
  @param code - The public error code.
  @param message - The safe message exposed to clients.
  @param cause - The underlying error, when available.
  */
  /**
  Creates an invalid input error.
  @param message - The validation message.
  @returns An application error with the invalid input code.
  */
  /**
  Creates a location not found error.
  @param message - The location lookup message.
  @returns An application error with the location not found code.
  */
  static locationNotFound(message: string): AppError {
    return new this(ErrorCodes.LOCATION_NOT_FOUND, message);
  }

  /**
  Creates an ambiguous location error.
  @param message - The disambiguation message.
  @returns An application error with the location ambiguous code.
  */
  static locationAmbiguous(message: string): AppError {
    return new this(ErrorCodes.LOCATION_AMBIGUOUS, message);
  }

  /**
  Creates a weather unavailable error.
  @param cause - The underlying provider error, when available.
  @returns An application error with a safe weather message.
  */
  static weatherUnavailable(cause?: unknown): AppError {
    return new this(ErrorCodes.WEATHER_UNAVAILABLE, PUBLIC_MESSAGES.weatherUnavailable, cause);
  }

  /**
  Creates a generic internal error.
  @param cause - The underlying error, when available.
  @returns An application error with a safe internal message.
  */
  static internal(cause?: unknown): AppError {
    return new this(ErrorCodes.INTERNAL_ERROR, PUBLIC_MESSAGES.internal, cause);
  }

  /**
  Converts an unknown error to a stable application error.
  @param error - The thrown value to normalize.
  @param graphqlCode - The GraphQL error code, when available.
  @returns The normalized application error.
  */
  static from(error: unknown, graphqlCode?: unknown): AppError {
    if (error instanceof this) return error;
    if (graphqlCode === 'GRAPHQL_PARSE_FAILED') {
      return new this(ErrorCodes.INVALID_QUERY, PUBLIC_MESSAGES.invalidQueryParse);
    }
    if (graphqlCode === 'GRAPHQL_VALIDATION_FAILED' || graphqlCode === 'BAD_USER_INPUT') {
      return new this(ErrorCodes.INVALID_QUERY, PUBLIC_MESSAGES.invalidQuery);
    }
    return graphqlCode === 'BAD_REQUEST'
      ? new this(ErrorCodes.INVALID_REQUEST, PUBLIC_MESSAGES.invalidRequest)
      : this.internal(error);
  }

  readonly code: ErrorCode;

  /** Create an application error with a stable public code.
  @param code Public error code.
  @param message Safe error message.
  @param cause Underlying error when available.
  */
  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AppError';
    this.code = code;
  }

  /**
  Creates the client-safe GraphQL error response.
  @param meta - GraphQL path and source locations.
  @param meta.path - The path to the field that failed.
  @param meta.locations - The source locations of the error.
  @returns A response containing only the public message and code.
  */
  toClientResponse(meta: {
    path?: readonly (string | number)[];
    locations?: readonly { line: number; column: number }[];
  }): ClientErrorResponse {
    return {
      message: this.message,
      path: meta.path,
      locations: meta.locations,
      extensions: { code: this.code },
    };
  }

  /**
  Indicates whether the error should be written to the server log.
  @returns Whether the error is a provider or internal failure.
  */
  get shouldLog(): boolean {
    return this.code === ErrorCodes.WEATHER_UNAVAILABLE || this.code === ErrorCodes.INTERNAL_ERROR;
  }
}
