import { isParseFailure, parseElapsed, parseGap, parseTimestamp } from "./time";

/** Returns a validation error, or null when empty or valid. */
export function validateStartTimestampInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = parseTimestamp(trimmed);
  return isParseFailure(parsed) ? parsed.error : null;
}

/** Returns a validation error, or null when empty or valid. */
export function validateReferenceElapsedInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = parseElapsed(trimmed);
  return isParseFailure(parsed) ? parsed.error : null;
}

/** Returns a validation error, or null when empty or valid. */
export function validateLaneGapInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^[+-]/.test(trimmed)) {
    const parsed = parseGap(trimmed);
    if (isParseFailure(parsed)) return parsed.error;
    if (!parsed.signed) return "Invalid gap format.";
    return null;
  }

  const parsed = parseElapsed(trimmed);
  return isParseFailure(parsed) ? parsed.error : null;
}
