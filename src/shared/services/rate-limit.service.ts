import { RedisService } from "./redis.service.js";

export class RateLimitService {
  private redis = new RedisService();

  async hit(key: string, maxAttempts: number, windowSeconds: number) {
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
