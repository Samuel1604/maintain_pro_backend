import { describe, expect, it, vi } from "vitest";
import { requestCorrelation } from "@/shared/middleware/request-correlation.js";

describe("request correlation middleware", () => {
  it("preserves a bounded caller request id", () => {
    const setHeader = vi.fn();
    const req = { get: () => "client-request-123" } as never;
    const res = { setHeader } as never;
    const next = vi.fn();

    requestCorrelation(req, res, next);

    expect((req as { requestId?: string }).requestId).toBe("client-request-123");
    expect(setHeader).toHaveBeenCalledWith("x-request-id", "client-request-123");
    expect(next).toHaveBeenCalledOnce();
  });

  it("generates a request id when none is supplied", () => {
    const setHeader = vi.fn();
    const req = { get: () => undefined } as never;
    const res = { setHeader } as never;

    requestCorrelation(req, res, vi.fn());

    expect((req as { requestId?: string }).requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(setHeader).toHaveBeenCalledOnce();
  });
});
