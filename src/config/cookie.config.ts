import { appConfig } from "./app.config.js";

export const refreshCookieOptions = {
  httpOnly: true,

  secure: appConfig.isProduction,

  sameSite: appConfig.isProduction ? "strict" : "lax",

  path: "/",

  maxAge: 7 * 24 * 60 * 60 * 1000,
} as const;


// auth.cookies.ts

import type { Response } from "express";

export function setAuthCookies(
  res: Response,
  refreshToken: string,
  sessionId: string,
) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  res.cookie("sessionId", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("refreshToken");
  res.clearCookie("sessionId");
}
