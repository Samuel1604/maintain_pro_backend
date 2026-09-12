import { z } from "zod";

/**
 * Converts a string or Date into a valid Date object.
 */
export function toDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

/**
 * Converts a Date to an ISO string, or undefined if null/undefined.
 */
export function toIsoString(value?: Date | null): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.toISOString();
}

/**
 * Converts a Date to an ISO string, or null if null/undefined.
 */
export function toNullableIsoString(value?: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString();
}

/**
 * Validates whether a string is a valid ISO/Date string.
 */
export function isValidDate(value: string): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return !isNaN(timestamp);
}

/**
 * Compares two dates/timestamps for equality.
 */
export function isSameDate(
  left?: Date | string | null,
  right?: Date | string | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  const leftTime = typeof left === "string" ? Date.parse(left) : left.getTime();
  const rightTime = typeof right === "string" ? Date.parse(right) : right.getTime();

  if (isNaN(leftTime) || isNaN(rightTime)) {
    return false;
  }

  return leftTime === rightTime;
}

/**
 * Zod schema for Date instances or valid ISO date strings transformed into Date objects.
 */
export const dateSchema = z.union([
  z.date(),
  z.string().refine((val) => isValidDate(val), {
    message: "Invalid date string",
  }).transform((val) => toDate(val)),
]);

/**
 * Zod schema for valid ISO 8601 date strings.
 */
export const isoDateSchema = z.string().refine((val) => isValidDate(val), {
  message: "Invalid ISO 8601 date string",
});
