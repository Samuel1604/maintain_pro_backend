import { redis } from "@/config/redis.js";

/**
 * Wrapper around Redis operations.
 *
 * Keeps Redis usage centralized and makes
 * future provider changes easier.
 */
export class RedisService {
  private static readonly localStore = new Map<string, { value: string; expiresAt?: number }>();

  private get disabled(): boolean {
    const value = process.env.REDIS_DISABLE_CONNECTION?.trim().toLowerCase();
    return value === "true" || value === "1" || value === "yes";
  }

  private fallbackAllowed(): boolean {
    return process.env.NODE_ENV !== "production";
  }

  /**
   * Store value in Redis.
   *
   * ttl is in seconds.
   */
  async set(key: string, value: string, ttl?: number) {
    if (this.disabled) {
      RedisService.localStore.set(key, {
        value,
        ...(ttl ? { expiresAt: Date.now() + ttl * 1000 } : {}),
      });
      return;
    }
    try {
      if (ttl) {
        await redis.set(key, value, "EX", ttl);
        return;
      }
      await redis.set(key, value);
    } catch (err) {
      if (!this.fallbackAllowed()) throw err;
      console.warn(`⚠️ Redis set failed for key '${key}', using local store fallback:`, err);
      RedisService.localStore.set(key, {
        value,
        ...(ttl ? { expiresAt: Date.now() + ttl * 1000 } : {}),
      });
    }
  }

  async setIfAbsent(key: string, value: string, ttl: number): Promise<boolean> {
    if (this.disabled) {
      const existing = this.localEntry(key);
      if (existing) return false;
      await this.set(key, value, ttl);
      return true;
    }
    try {
      const result = await redis.set(key, value, "EX", ttl, "NX");
      return result === "OK";
    } catch (err) {
      if (!this.fallbackAllowed()) throw err;
      console.warn(`⚠️ Redis setIfAbsent failed for key '${key}', using local store fallback:`, err);
      const existing = this.localEntry(key);
      if (existing) return false;
      RedisService.localStore.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
      return true;
    }
  }

  /**
   * Get value by key.
   */
  async get(key: string) {
    if (this.disabled) return this.localEntry(key)?.value ?? null;
    try {
      return await redis.get(key);
    } catch (err) {
      if (!this.fallbackAllowed()) throw err;
      console.warn(`⚠️ Redis get failed for key '${key}', checking local store fallback:`, err);
      return this.localEntry(key)?.value ?? null;
    }
  }

  /**
   * Delete key.
   */
  async delete(key: string) {
    if (this.disabled) return RedisService.localStore.delete(key) ? 1 : 0;
    try {
      return await redis.del(key);
    } catch (err) {
      if (!this.fallbackAllowed()) throw err;
      console.warn(`⚠️ Redis delete failed for key '${key}':`, err);
      return RedisService.localStore.delete(key) ? 1 : 0;
    }
  }

  /** Atomically deletes a key only when it still contains the expected value. */
  async deleteIfValue(key: string, expectedValue: string): Promise<boolean> {
    if (this.disabled) {
      const current = this.localEntry(key);
      if (!current || current.value !== expectedValue) return false;
      RedisService.localStore.delete(key);
      return true;
    }
    try {
      const result = await redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        1,
        key,
        expectedValue,
      );
      return result === 1;
    } catch (error) {
      if (!this.fallbackAllowed()) throw error;
      const current = this.localEntry(key);
      if (!current || current.value !== expectedValue) return false;
      RedisService.localStore.delete(key);
      return true;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (this.disabled) {
      let removed = 0;
      for (const key of RedisService.localStore.keys()) {
        if (key.startsWith(pattern.replace(/\*$/, ""))) { RedisService.localStore.delete(key); removed += 1; }
      }
      return removed;
    }
    try {
      const keys: string[] = [];
      for await (const key of redis.scanStream({ match: pattern, count: 100 })) keys.push(...(Array.isArray(key) ? key : [key]));
      return keys.length ? await redis.del(...keys) : 0;
    } catch (error) { if (!this.fallbackAllowed()) throw error; return 0; }
  }

  /**
   * Check if key exists.
   */
  async exists(key: string) {
    if (this.disabled) return this.localEntry(key) ? 1 : 0;
    try {
      return await redis.exists(key);
    } catch (error) {
      if (!this.fallbackAllowed()) throw error;
      return this.localEntry(key) ? 1 : 0;
    }
  }

  /**
   * Increment numeric value.
   */
  async increment(key: string) {
    if (this.disabled) {
      const current = this.localEntry(key);
      const next = (current ? Number(current.value) : 0) + 1;
      RedisService.localStore.set(key, {
        value: String(next),
        ...(current?.expiresAt ? { expiresAt: current.expiresAt } : {}),
      });
      return next;
    }
    try {
      return await redis.incr(key);
    } catch (err) {
      if (!this.fallbackAllowed()) throw err;
      console.warn(`⚠️ Redis increment failed for key '${key}', using local store fallback:`, err);
      const current = this.localEntry(key);
      const next = (current ? Number(current.value) : 0) + 1;
      RedisService.localStore.set(key, {
        value: String(next),
        ...(current?.expiresAt ? { expiresAt: current.expiresAt } : {}),
      });
      return next;
    }
  }

  /**
   * Set expiration time in seconds.
   */
  async expire(key: string, ttl: number) {
    if (this.disabled) {
      const current = this.localEntry(key);
      if (!current) return 0;
      RedisService.localStore.set(key, { ...current, expiresAt: Date.now() + ttl * 1000 });
      return 1;
    }
    try {
      return await redis.expire(key, ttl);
    } catch (err) {
      if (!this.fallbackAllowed()) throw err;
      console.warn(`⚠️ Redis expire failed for key '${key}':`, err);
      const current = this.localEntry(key);
      if (!current) return 0;
      RedisService.localStore.set(key, { ...current, expiresAt: Date.now() + ttl * 1000 });
      return 1;
    }
  }

  /**
   * Get remaining TTL for a key.
   */
  async ttl(key: string) {
    if (this.disabled) {
      const current = this.localEntry(key);
      if (!current?.expiresAt) return -1;
      return Math.max(0, Math.ceil((current.expiresAt - Date.now()) / 1000));
    }
    try {
      return await redis.ttl(key);
    } catch (error) {
      if (!this.fallbackAllowed()) throw error;
      const current = this.localEntry(key);
      if (!current?.expiresAt) return -1;
      return Math.max(0, Math.ceil((current.expiresAt - Date.now()) / 1000));
    }
  }

  private localEntry(key: string) {
    const entry = RedisService.localStore.get(key);
    if (entry?.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      RedisService.localStore.delete(key);
      return undefined;
    }
    return entry;
  }
}
