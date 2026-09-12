import { describe, expect, it, vi } from "vitest";
import { RedisCache } from "@/infrastructure/cache/redis.cache.js";

function fakeRedis(value: string | null = null) {
  return { get: vi.fn().mockResolvedValue(value), set: vi.fn().mockResolvedValue(undefined), delete: vi.fn().mockResolvedValue(1) };
}

describe("RedisCache", () => {
  it("serializes DTOs and expires them with the requested TTL", async () => {
    const redis = fakeRedis();
    const cache = new RedisCache(redis as never);
    await cache.set("cache:v1:org:org-a:settings", { organizationId: "org-a", locale: "en-NG" }, 300);
    expect(redis.set).toHaveBeenCalledWith("cache:v1:org:org-a:settings", JSON.stringify({ organizationId: "org-a", locale: "en-NG" }), 300);
  });

  it("treats malformed values as misses and removes them", async () => {
    const redis = fakeRedis("{malformed");
    const cache = new RedisCache(redis as never);
    await expect(cache.get("cache:v1:user:user-a:settings")).resolves.toBeNull();
    expect(redis.delete).toHaveBeenCalledWith("cache:v1:user:user-a:settings");
  });

  it("falls back safely when Redis reads fail", async () => {
    const redis = fakeRedis();
    redis.get.mockRejectedValue(new Error("redis unavailable"));
    const cache = new RedisCache(redis as never);
    await expect(cache.get("cache:v1:vendor:vendor-a:settings")).resolves.toBeNull();
  });
});
