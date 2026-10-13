export type ErrorCode =
  | 'INVALID_INPUT'
  | 'LOCATION_NOT_FOUND'
  | 'LOCATION_AMBIGUOUS'
  | 'INVALID_QUERY'
  | 'INVALID_REQUEST'
  | 'WEATHER_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ClientErrorResponse {
  message: string;
  path?: readonly (string | number)[];
  locations?: readonly { line: number; column: number }[];
  extensions: { code: ErrorCode };
}
