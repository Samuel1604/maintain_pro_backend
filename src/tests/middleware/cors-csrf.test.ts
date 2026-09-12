import { afterEach, describe, expect, it, vi } from "vitest";
import { corsOptions } from "@/config/cors.js";
import { csrfProtection } from "@/shared/middleware/csrf.js";

describe("request protection contracts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows idempotency keys through CORS", () => {
    expect(corsOptions.allowedHeaders).toContain("Idempotency-Key");
  });

  it("rejects a mutating request without a matching CSRF token", () => {
    vi.stubEnv("NODE_ENV", "production");
    const next = vi.fn();
    csrfProtection(
      {
        method: "POST",
        path: "/api/v1/work-orders",
        cookies: {},
        headers: {},
      } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]?.[0]).toMatchObject({ statusCode: 403 });
  });

  it("keeps pre-session login exempt from the CSRF check", () => {
    const next = vi.fn();
    csrfProtection(
      {
        method: "POST",
        path: "/api/v1/auth/login",
        cookies: {},
        headers: {},
      } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });
});
