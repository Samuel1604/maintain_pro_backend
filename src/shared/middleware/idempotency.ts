import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { RedisService } from "@/shared/services/redis.service.js";

const redis = new RedisService();
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const LOCK_TTL_SECONDS = 60;

function fingerprint(req: Request): string {
  return crypto.createHash("sha256").update(JSON.stringify({ method: req.method, path: req.path, body: req.body ?? null })).digest("hex");
}

/** Replays completed mutation responses when a client retries the same request key. */
export async function idempotency(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING_METHODS.has(req.method) || req.path.includes("/auth/")) return next();
  const key = req.header("Idempotency-Key")?.trim();
  if (!key || key.length > 200) return next();

  const actorScope = crypto.createHash("sha256").update(req.headers.cookie ?? req.headers.authorization ?? req.ip ?? "anonymous").digest("hex").slice(0, 24);
  const cacheKey = `http:idempotency:${actorScope}:${req.method}:${req.path}:${key}`;
  const lockKey = `${cacheKey}:lock`;
  const requestFingerprint = fingerprint(req);
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const response = JSON.parse(cached) as { status: number; body: unknown; fingerprint: string };
      if (response.fingerprint !== requestFingerprint) return res.status(409).json({ success: false, message: "Idempotency key was reused with different request data." });
      return res.status(response.status).json(response.body);
    }

    const owner = await redis.setIfAbsent(lockKey, requestFingerprint, LOCK_TTL_SECONDS);
    if (!owner) {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const replay = await redis.get(cacheKey);
        if (replay) {
          const response = JSON.parse(replay) as { status: number; body: unknown; fingerprint: string };
          if (response.fingerprint !== requestFingerprint) return res.status(409).json({ success: false, message: "Idempotency key was reused with different request data." });
          return res.status(response.status).json(response.body);
        }
      }
      return res.status(409).json({ success: false, message: "This operation is still processing. Retry with the same Idempotency-Key." });
    }
  } catch (error) {
    // In production Redis is part of the idempotency contract. Proceeding
    // after a Redis outage could execute a financial or state-changing
    // request more than once across API replicas.
    if (process.env.NODE_ENV === "production") throw error;
    // Development/test environments may intentionally run without Redis.
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode < 400) {
      void redis.set(cacheKey, JSON.stringify({ status: res.statusCode, body, fingerprint: requestFingerprint }), CACHE_TTL_SECONDS).catch(() => undefined);
    }
    void redis.delete(lockKey).catch(() => undefined);
    return originalJson(body);
  }) as Response["json"];
  return next();
}
