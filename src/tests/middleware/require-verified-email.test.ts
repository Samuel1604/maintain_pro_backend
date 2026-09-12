import { describe, it, expect, vi } from "vitest";
import type { Response, NextFunction } from "express";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import {
  AuthenticationException,
  AuthorizationException,
} from "@/shared/errors/index.js";
import type { AuthRequest } from "@/shared/types/request.js";

function fakeAuthenticatedRequest(
  overrides: Partial<AuthRequest["user"]> = {},
): AuthRequest {
  return {
    user: {
      userId: "user-1",
      role: "admin",
      isVerified: false,
      ...overrides,
    },
  } as unknown as AuthRequest;
}

describe("requireVerifiedEmail", () => {
  /**
   * This is the mechanism that stops an unverified account from reaching
   * protected business functionality (billing, facilities, invitations,
   * work-orders, vendor-applications all mount it — see their .routes.ts
   * files). authMiddleware alone does NOT reject unverified accounts by
   * design (verification is layered on as an authorization concern), so
   * this gate is what actually enforces the restriction.
   */
  it("blocks a request from an unverified user with code EMAIL_NOT_VERIFIED", async () => {
    const req = fakeAuthenticatedRequest({ isVerified: false });
    const next = vi.fn();

    await requireVerifiedEmail(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]![0];
    expect(error).toBeInstanceOf(AuthorizationException);
    expect(error.code).toBe("EMAIL_NOT_VERIFIED");
    expect(error.statusCode).toBe(403);
  });

  it("allows a request from a verified user through", async () => {
    const req = fakeAuthenticatedRequest({ isVerified: true });
    const next = vi.fn();

    await requireVerifiedEmail(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a request with no authenticated user as an authentication error, not an authorization one", async () => {
    const req = { user: undefined } as unknown as AuthRequest;
    const next = vi.fn();

    await requireVerifiedEmail(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(AuthenticationException);
  });
});
