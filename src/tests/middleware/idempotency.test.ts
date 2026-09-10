import { afterEach, describe, expect, it, vi } from "vitest";
import { idempotency } from "@/shared/middleware/idempotency.js";
import { RedisService } from "@/shared/services/redis.service.js";

describe("idempotency middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = "test";
  });

  it("fails closed in production when Redis is unavailable", async () => {
    process.env.NODE_ENV = "production";
    const redisError = new Error("redis unavailable");
    vi.spyOn(RedisService.prototype, "get").mockRejectedValue(redisError);
    const request = {
      method: "POST",
      path: "/api/v1/work-orders",
      body: { title: "Duplicate-sensitive mutation" },
      headers: { cookie: "accessToken=session" },
      ip: "127.0.0.1",
      header: (name: string) => name === "Idempotency-Key" ? "operation-1" : undefined,
    } as never;

    await expect(idempotency(request, {} as never, vi.fn())).rejects.toBe(redisError);
  });
});
