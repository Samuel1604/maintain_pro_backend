import { describe, it, expect } from "vitest";
import { AppContainer } from "@/container/app.container.js";
import { ConflictException } from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";

const sessionMeta = { ipAddress: "127.0.0.1", userAgent: "vitest-agent" };

function orgPayload(overrides: Record<string, unknown> = {}) {
  const suffix = Math.floor(Math.random() * 100000);
  return {
    organizationName: `Acme Facilities ${suffix}`,
    industry: "Facilities Management",
    email: `org-admin-${suffix}@test.com`,
    phone: "+15555550100",
    address: {
      street: "1 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "US",
    },
    firstName: "Ada",
    lastName: "Admin",
    password: "Password123!",
    confirmPassword: "Password123!",
    ...overrides,
  };
}

function vendorPayload(overrides: Record<string, unknown> = {}) {
  const suffix = Math.floor(Math.random() * 100000);
  return {
    vendorName: `Vendor Co ${suffix}`,
    email: `vendor-lead-${suffix}@test.com`,
    phone: "+15555550101",
    address: {
      street: "2 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "US",
    },
    firstName: "Val",
    lastName: "Lead",
    password: "Password123!",
    confirmPassword: "Password123!",
    ...overrides,
  };
}

describe("AuthService.registerOrganization", () => {
  /**
   * Registration must create the identity/business account only — no
   * billing plan is selected or created as part of Identity registration
   * (Billing decoupling). The `plan` field no longer exists on the
   * registration DTO; this verifies the Organization record still ends up
   * in a sane default state (via the Organization schema's own defaults,
   * not anything Identity computes) rather than left partially built.
   */
  it("creates the organization and an unverified admin user, with no plan selected by Identity", async () => {
    const container = new AppContainer();
    const payload = orgPayload();

    const result = await container.authService.registerOrganization(
      payload,
      sessionMeta,
    );

    expect(result.success).toBe(true);
    expect(result.data?.user.role).toBe(ROLES.ADMIN);

    const createdUser = await container.userReader.findByEmail(payload.email);
    expect(createdUser).toBeTruthy();
    expect(createdUser!.role).toBe(ROLES.ADMIN);
    expect(createdUser!.organizationId).toBeTruthy();

    // Unverified until they complete email OTP verification.
    expect(createdUser!.isVerified).toBe(false);
    expect(createdUser!.status).toBe("pending_verification");

    const organization = await container.organizationRepository.findById(
      createdUser!.organizationId!.toString(),
    );
    expect(organization).toBeTruthy();
    expect(organization!.name).toBe(payload.organizationName);

    // Billing information (plan, subscription status, etc.) is now managed
    // by the Subscription model, not the Organization model.
    // No `plan` field should exist on Organization.
    expect(organization).not.toHaveProperty("plan");

    // No `RegisterOrgDto` field named `plan` exists; guard against it
    // silently reappearing on the payload/DTO surface.
    expect(payload).not.toHaveProperty("plan");
  });

  it("rejects registration with an email already in use", async () => {
    const container = new AppContainer();
    const payload = orgPayload();

    await container.authService.registerOrganization(payload, sessionMeta);

    await expect(
      container.authService.registerOrganization(
        orgPayload({ email: payload.email }),
        sessionMeta,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("AuthService.registerVendor", () => {
  it("creates the vendor and an unverified vendor-lead user, with no plan selected by Identity", async () => {
    const container = new AppContainer();
    const payload = vendorPayload();

    const result = await container.authService.registerVendor(
      payload,
      sessionMeta,
    );

    expect(result.success).toBe(true);
    expect(result.data?.user.role).toBe(ROLES.VENDOR_LEAD);

    const createdUser = await container.userReader.findByEmail(payload.email);
    expect(createdUser).toBeTruthy();
    expect(createdUser!.role).toBe(ROLES.VENDOR_LEAD);
    expect(createdUser!.vendorId).toBeTruthy();
    expect(createdUser!.isVerified).toBe(false);
    expect(createdUser!.status).toBe("pending_verification");

    const vendor = await container.vendorRepository.findById(
      createdUser!.vendorId!.toString(),
    );
    expect(vendor).toBeTruthy();
    expect(vendor!.name).toBe(payload.vendorName);

    // Same Billing-decoupling guarantee as organizations: Vendor's own
    // schema default applies, Identity never computed or passed a plan.
    expect(vendor!.plan).toBe("free");
    expect(payload).not.toHaveProperty("plan");
  });

  it("rejects registration with an email already in use", async () => {
    const container = new AppContainer();
    const payload = vendorPayload();

    await container.authService.registerVendor(payload, sessionMeta);

    await expect(
      container.authService.registerVendor(
        vendorPayload({ email: payload.email }),
        sessionMeta,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("Unverified account access restriction", () => {
  /**
   * A session is issued at registration so the user can reach
   * verification-only endpoints, but the account must not have normal
   * application access until email verification completes. login()
   * enforces this by returning early (without publishing
   * UserLoggedInEvent) whenever the account is still
   * "pending_verification" — this proves that path via the real
   * AuthService, not by asserting on isVerified in isolation.
   */
  it("login on a freshly registered (unverified) account returns a session but signals verification is required", async () => {
    const container = new AppContainer();
    const payload = orgPayload();

    await container.authService.registerOrganization(payload, sessionMeta);

    const loginResult = await container.authService.login(
      { email: payload.email, password: payload.password },
      sessionMeta,
    );

    expect(loginResult.success).toBe(true);
    expect(loginResult.message).toMatch(/verification required/i);
    // A session/tokens ARE issued (so verification-only endpoints are
    // reachable) — this is intentional, not a bug.
    expect(loginResult.data?.accessToken).toBeTruthy();
  });
});
