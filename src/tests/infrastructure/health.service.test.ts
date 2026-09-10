import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthService } from "@/infrastructure/health/health.service.js";
import { redis } from "@/config/redis.js";

describe("HealthService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports liveness without requiring infrastructure", async () => {
    const result = await new HealthService().liveness();
    expect(result.status).toBe("ok");
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("treats explicitly disabled Redis as non-blocking", async () => {
    const previous = process.env.REDIS_DISABLE_CONNECTION;
    process.env.REDIS_DISABLE_CONNECTION = "true";
    vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(1);
    try {
      const result = await new HealthService().readiness();
      expect(result.dependencies.redis?.status).toBe("disabled");
      expect(result.ready).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.REDIS_DISABLE_CONNECTION;
      else process.env.REDIS_DISABLE_CONNECTION = previous;
    }
  });

  it("fails readiness when MongoDB is unavailable", async () => {
    const previous = process.env.REDIS_DISABLE_CONNECTION;
    process.env.REDIS_DISABLE_CONNECTION = "true";
    vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(0);
    try {
      const result = await new HealthService().readiness();
      expect(result.dependencies.mongodb?.status).toBe("down");
      expect(result.ready).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.REDIS_DISABLE_CONNECTION;
      else process.env.REDIS_DISABLE_CONNECTION = previous;
    }
  });

  it("fails readiness when required Redis is unavailable", async () => {
    const previous = process.env.REDIS_DISABLE_CONNECTION;
    delete process.env.REDIS_DISABLE_CONNECTION;
    vi.spyOn(mongoose.connection, "readyState", "get").mockReturnValue(1);
    vi.spyOn(redis, "ping").mockRejectedValue(new Error("redis unavailable"));
    try {
      const result = await new HealthService().readiness();
      expect(result.dependencies.redis?.status).toBe("down");
      expect(result.ready).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.REDIS_DISABLE_CONNECTION;
      else process.env.REDIS_DISABLE_CONNECTION = previous;
    }
  });
});
