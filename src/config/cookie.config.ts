import ms, { type StringValue } from "ms";
import type { Response } from "express";
import { appConfig } from "./app.config.js";
import { jwtConfig } from "./jwt.config.js";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "@/shared/utils/csrf.js";

const toMs = (value: string): number => ms(value as StringValue);

const baseCookieOptions = {
  secure: appConfig.isProduction,

  // The production frontend and API are hosted on different sites
  // (maintainpro.samueldev.cv and *.onrender.com). Credentialed browser
  // requests therefore require SameSite=None together with Secure.
  sameSite: appConfig.isProduction ? "none" : "lax",

  path: "/",
} as const;

export const accessCookieOptions = {
  ...baseCookieOptions,
  httpOnly: true,
  maxAge: toMs(jwtConfig.accessExpiresIn),
} as const;

export const refreshCookieOptions = {
  ...baseCookieOptions,
  httpOnly: true,
  maxAge: toMs(jwtConfig.refreshExpiresIn),
} as const;

/**
 * NOT httpOnly — the double-submit CSRF pattern requires same-origin JS
 * to be able to read this value and mirror it into a request header.
 * Its security comes from SameSite + the fact that a cross-site page
 * cannot read cookies belonging to this origin, not from secrecy at
 * rest.
 */
export const csrfCookieOptions = {
  ...baseCookieOptions,
  httpOnly: false,
  maxAge: toMs(jwtConfig.refreshExpiresIn),
} as const;

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  sessionId: string,
) {
  res.cookie("accessToken", accessToken, accessCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  res.cookie("sessionId", sessionId, refreshCookieOptions);

  // Rotate the csrf token alongside every new session (login, register,
  // refresh, etc.) as defense-in-depth so a leaked pre-auth csrf token
  // can't be paired with a newly authenticated session.
  const csrfToken = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);

  return csrfToken;
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.clearCookie("sessionId");
  res.clearCookie(CSRF_COOKIE_NAME);
}
