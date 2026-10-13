// A missing numeric value is serialized as GraphQL null.
// eslint-disable-next-line unicorn/no-null -- The schema distinguishes unavailable values with null.
const NO_NUMBER = null;

/**
Converts a value to a finite number, returning null when it is absent or invalid.
@param value - The value to convert.
@returns A finite number, or the unavailable value marker.
*/
export function toFiniteNumber(value: unknown): number | null {
  const invalidValues: unknown[] = [NO_NUMBER, undefined, ''];
  if (invalidValues.includes(value)) return NO_NUMBER;
  const number = Number(value);
  return Number.isFinite(number) ? number : NO_NUMBER;
}

/**
Restricts a number to the inclusive minimum and maximum bounds.
@param value - The value to constrain.
@param minimum - The inclusive lower bound.
@param maximum - The inclusive upper bound.
@returns The value restricted to the supplied range.
*/
export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
