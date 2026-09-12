import { afterEach, describe, expect, it, vi } from "vitest";
import { redis } from "@/config/redis.js";
import { RedisService } from "@/shared/services/redis.service.js";

describe("Redis fallback security boundary", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDisabled = process.env.REDIS_DISABLE_CONNECTION;

  afterEach(() => {
    vi.restoreAllMocks();
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDisabled === undefined) delete process.env.REDIS_DISABLE_CONNECTION;
    else process.env.REDIS_DISABLE_CONNECTION = previousDisabled;
  });

  it("fails closed in production when Redis cannot increment", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.REDIS_DISABLE_CONNECTION;
    const error = new Error("redis unavailable");
    vi.spyOn(redis, "incr").mockRejectedValue(error);

    await expect(new RedisService().increment("security:rate-limit")).rejects.toBe(error);
  });

  it("allows the local fallback outside production", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.REDIS_DISABLE_CONNECTION;
    vi.spyOn(redis, "incr").mockRejectedValue(new Error("redis unavailable"));

    await expect(new RedisService().increment("development:rate-limit")).resolves.toBe(1);
  });
});
