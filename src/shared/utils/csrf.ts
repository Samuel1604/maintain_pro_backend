import crypto from "node:crypto";

/**
 * Double-submit-cookie CSRF token helpers.
 *
 * The token itself carries no secret server-side state — its security
 * comes from the fact that it's readable only by same-origin JS (the
 * cookie is NOT httpOnly) while cross-site forms/requests have no way
 * to read it and therefore can't reproduce it in the header.
 */

export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Timing-safe comparison. Both inputs must be equal length hex strings;
 * mismatched lengths are treated as a mismatch rather than throwing.
 */
export function isCsrfTokenValid(
  cookieToken: string | undefined,
  headerToken: string | string[] | undefined,
): boolean {
  if (!cookieToken || !headerToken || Array.isArray(headerToken)) {
    return false;
  }

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}
