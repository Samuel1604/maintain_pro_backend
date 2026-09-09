import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AuthenticationException } from "@/shared/errors/index.js";
import { userReader } from "@/container/index.js";
import { RedisService } from "@/shared/services/redis.service.js";

const authCache = new RedisService();
const AUTH_CACHE_TTL = 45;

/** Authenticates the caller; verified-email checks are added by route policy. */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const cookieToken = req.cookies?.accessToken as string | undefined;

    let token = cookieToken;

    if (!token) {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new AuthenticationException(
          "Authentication required",
        );
      }

      const [scheme, headerToken] = authHeader.split(" ");

      if (scheme !== "Bearer" || !headerToken) {
        throw new AuthenticationException("Invalid authorization format");
      }

      token = headerToken;
    }

    const decoded = verifyAccessToken(token);

    if (!decoded || typeof decoded === "string") {
      throw new AuthenticationException("Invalid or expired token");
    }

    const cacheKey = `cache:v2:user:${decoded.userId}:authorization`;
    // Verification state is security-sensitive and must never come from a
    // potentially stale cache. Read the current user record for every
    // authenticated request; the cache remains available for non-security
    // context only.
    const user = await userReader.findById(decoded.userId);

    if (!user) {
      throw new AuthenticationException("User not found");
    }

    const authContext = {
      isVerified: user.isVerified,
      ...((decoded.organizationId || user.organizationId) && { organizationId: decoded.organizationId ?? user.organizationId?.toString() }),
      ...((decoded.vendorId || user.vendorId) && { vendorId: decoded.vendorId ?? user.vendorId?.toString() }),
      ...((decoded.facilityId || user.facilityId) && { facilityId: decoded.facilityId ?? user.facilityId?.toString() }),
    };
    void authCache.set(cacheKey, authContext, AUTH_CACHE_TTL).catch(() => undefined);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      ...authContext,
    };

    return next();
  } catch (error) {
    return next(
      error instanceof AuthenticationException
        ? error
        : new AuthenticationException("Invalid or expired token"),
    );
  }
};
