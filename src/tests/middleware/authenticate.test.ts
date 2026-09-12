import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { generateAccessToken } from "@/shared/utils/jwt.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { OrganizationFactory } from "@/tests/factories/organization.factory.js";
import { VendorFactory } from "@/tests/factories/vendor.factory.js";
import { AuthenticationException } from "@/shared/errors/index.js";

function fakeRequest(token: string): Request {
  return {
    cookies: { accessToken: token },
    headers: {},
  } as unknown as Request;
}

describe("authMiddleware", () => {
  /**
   * Regression test for: req.user was built from only userId/role/isVerified,
   * dropping organizationId/vendorId/facilityId even though they're signed
   * into the access token (see generateAccessToken in session.service.ts).
   * Every downstream tenant-scoping check reading actor.organizationId /
   * actor.vendorId / actor.facilityId silently saw undefined.
   */
  it("copies organizationId from the token onto req.user", async () => {
    const org = await OrganizationFactory.create();
    const { user } = await UserFactory.create({ organizationId: org._id });

    const token = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
      organizationId: org._id.toString(),
    });

    const req = fakeRequest(token);
    const next = vi.fn();

    await authMiddleware(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.organizationId).toBe(org._id.toString());
  });

  it("copies vendorId from the token onto req.user", async () => {
    const vendor = await VendorFactory.create();
    const { user } = await UserFactory.create({ vendorId: vendor._id });

    const token = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
      vendorId: vendor._id.toString(),
    });

    const req = fakeRequest(token);
    const next = vi.fn();

    await authMiddleware(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.vendorId).toBe(vendor._id.toString());
  });

  it("does not set organizationId/vendorId when absent from the token", async () => {
    const { user } = await UserFactory.create();

    const token = generateAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    const req = fakeRequest(token);
    const next = vi.fn();

    await authMiddleware(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.organizationId).toBeUndefined();
    expect(req.user?.vendorId).toBeUndefined();
  });

  it("rejects a request with no token", async () => {
    const req = { cookies: {}, headers: {} } as unknown as Request;
    const next = vi.fn();

    await authMiddleware(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(AuthenticationException);
  });
});
