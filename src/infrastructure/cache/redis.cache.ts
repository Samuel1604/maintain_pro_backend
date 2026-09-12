import type { Logger } from "@/infrastructure/logging/logger.interface.js";
import { RedisService } from "@/shared/services/redis.service.js";
import type { Cache } from "./cache.interface.js";

/** Best-effort application cache. Redis outages always fall back to persistence. */
export class RedisCache implements Cache {
  private static readonly stats = { hits: 0, misses: 0, errors: 0 };
  static getStats() { return { ...RedisCache.stats }; }
  private static readonly l1 = new Map<string, { value: unknown; expiresAt: number }>();
  private static readonly l1MaxEntries = 1000;
  constructor(private readonly redis = new RedisService(), private readonly logger?: Logger) {}

  async get<T>(key: string): Promise<T | null> {
    const started = Date.now();
    const local = RedisCache.l1.get(key);
    if (local) {
      if (local.expiresAt > Date.now()) { RedisCache.stats.hits += 1; return local.value as T; }
      RedisCache.l1.delete(key);
    }
    try {
      const raw = await this.redis.get(key);
      if (!raw) { RedisCache.stats.misses += 1; this.log("miss", key, started); return null; }
      try {
        const value = JSON.parse(raw) as T;
        RedisCache.remember(key, value, 5000);
        this.log("hit", key, started);
        return value;
      } catch {
        await this.redis.delete(key).catch(() => undefined);
        this.logger?.warn("[Cache] Invalid serialized value removed", { operation: "get", key: safeKey(key) });
        return null;
      }
    } catch (error) {
      RedisCache.stats.errors += 1;
      this.logger?.warn("[Cache] Read failed; using source of truth", { operation: "get", key: safeKey(key), error: String(error) });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    RedisCache.remember(key, value, Math.min(ttlSeconds * 1000, 5000));
    try { await this.redis.set(key, JSON.stringify(value), ttlSeconds); this.log("set", key, Date.now()); }
    catch (error) { this.logger?.warn("[Cache] Write failed; continuing without cache", { operation: "set", key: safeKey(key), error: String(error) }); }
  }

  async delete(key: string): Promise<void> {
    RedisCache.l1.delete(key);
    try { await this.redis.delete(key); this.log("invalidate", key, Date.now()); }
    catch (error) { this.logger?.warn("[Cache] Invalidation failed", { operation: "delete", key: safeKey(key), error: String(error) }); }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const prefix = pattern.replace(/\*$/, "");
    for (const key of RedisCache.l1.keys()) if (key.startsWith(prefix)) RedisCache.l1.delete(key);
    await this.redis.deleteByPattern(pattern);
  }

  private static remember(key: string, value: unknown, ttlMs: number): void {
    if (RedisCache.l1.size >= RedisCache.l1MaxEntries && !RedisCache.l1.has(key)) RedisCache.l1.delete(RedisCache.l1.keys().next().value as string);
    RedisCache.l1.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  private log(operation: string, key: string, started: number): void { this.logger?.debug?.("[Cache] Operation", { operation, key: safeKey(key), latencyMs: Date.now() - started }); }
}

function safeKey(key: string): string { return key.replace(/(user|org|vendor):[^:]+/g, "$1:<scoped>"); }
