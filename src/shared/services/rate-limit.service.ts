import { RedisService } from "./redis.service.js";

export class RateLimitService {
  private redis = new RedisService();
  private readonly localCounters = new Map<string, { count: number; expiresAt: number }>();

  async hit(key: string, maxAttempts: number, windowSeconds: number) {
    const redisDisabled = ["true", "1", "yes"].includes(
      process.env.REDIS_DISABLE_CONNECTION?.trim().toLowerCase() ?? "",
    );

    if (redisDisabled) {
      const now = Date.now();
      const current = this.localCounters.get(key);
      const entry = !current || current.expiresAt <= now
        ? { count: 1, expiresAt: now + windowSeconds * 1000 }
        : { count: current.count + 1, expiresAt: current.expiresAt };
      this.localCounters.set(key, entry);
      return {
        count: entry.count,
        allowed: entry.count <= maxAttempts,
        remaining: Math.max(0, maxAttempts - entry.count),
        ttl: Math.max(0, Math.ceil((entry.expiresAt - now) / 1000)),
      };
    }

    const count = await this.redis.increment(key);

    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    return {
      count,
      allowed: count <= maxAttempts,
      remaining: Math.max(0, maxAttempts - count),
      ttl: await this.redis.ttl(key),
    };
  }
}
