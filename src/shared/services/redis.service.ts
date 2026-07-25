import { redis } from "@/config/redis.js";

/**
 * Wrapper around Redis operations.
 *
 * Keeps Redis usage centralized and makes
 * future provider changes easier.
 */
export class RedisService {
  /**
   * Store value in Redis.
   *
   * ttl is in seconds.
   */
  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await redis.set(key, value, "EX", ttl);
      return;
    }

    await redis.set(key, value);
  }

  /**
   * Get value by key.
   */
  async get(key: string) {
    return redis.get(key);
  }

  /**
   * Delete key.
   */
  async delete(key: string) {
    return redis.del(key);
  }

  /**
   * Check if key exists.
   *
   * Returns:
   * 1 = exists
   * 0 = does not exist
   */
  async exists(key: string) {
    return redis.exists(key);
  }

  /**
   * Increment numeric value.
   *
   * Useful for:
   * - Rate limiting
   * - Login attempts
   * - OTP requests
   */
  async increment(key: string) {
    return redis.incr(key);
  }

  /**
   * Set expiration time in seconds.
   */
  async expire(key: string, ttl: number) {
    return redis.expire(key, ttl);
  }

  /**
   * Get remaining TTL for a key.
   *
   * Useful when showing:
   * "Try again in X seconds"
   */
  async ttl(key: string) {
    return redis.ttl(key);
  }
}
