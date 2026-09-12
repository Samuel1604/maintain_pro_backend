import { describe, it, expect, vi } from "vitest";
import { AppContainer } from "@/container/app.container.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { VerificationLinkRequestedEvent } from "@/modules/identity/events/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registerUnverifiedOrgAdmin(container: AppContainer) {
  const suffix = Math.floor(Math.random() * 100_000);
  const email = `verif-link-${suffix}@test.com`;
  await container.authService.registerOrganization(
    {
      organizationName: `VerifLink Test Org ${suffix}`,
      industry: "Facilities Management",
      email,
      phone: "+15555550199",
      address: {
        street: "1 Link St",
        city: "Springfield",
        state: "IL",
        postalCode: "62701",
        country: "US",
      },
      firstName: "Ada",
      lastName: "Admin",
      password: "Password123!",
      confirmPassword: "Password123!",
    },
    { ipAddress: "127.0.0.1", userAgent: "vitest-agent" },
  );
  return email;
}

// ---------------------------------------------------------------------------
// P0-1/P0-2 & P5-3: response shape & normalization
// ---------------------------------------------------------------------------

describe("AuthService.regenerateVerificationLink — response shape & normalization (P5-3)", () => {
  /**
   * The response data object must only contain expiresInSeconds.
   * Before P0-1/P0-2 the service returned verificationUrl in the HTTP
   * response body, leaking a secret one-time token via CDN logs, browser
   * history, and JS error reporting.
   */
  it("returns success:true and expiresInSeconds but NO verificationUrl in the result", async () => {
    const container = new AppContainer();
    const email = await registerUnverifiedOrgAdmin(container);

    const result = await container.authService.regenerateVerificationLink(email);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("expiresInSeconds");
    expect(result.data).not.toHaveProperty("verificationUrl");

    // Belt-and-suspenders: ensure the full serialised result contains no
    // verificationUrl key at any nesting level.
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain("verificationUrl");
  });

  /**
   * P5-3: Non-existent email, unverified email, and already-verified email
   * must return the exact same response shape and payload to prevent account enumeration.
   */
  it("returns identical response shape for non-existent, unverified, and already-verified accounts", async () => {
    const container = new AppContainer();
    const unverifiedEmail = await registerUnverifiedOrgAdmin(container);
    const { user: verifiedUser } = await UserFactory.create({ isVerified: true });

    const nonExistentResult = await container.authService.regenerateVerificationLink("ghost-nonexistent@test.com");
    const unverifiedResult = await container.authService.regenerateVerificationLink(unverifiedEmail);
    const verifiedResult = await container.authService.regenerateVerificationLink(verifiedUser.email);

    // All three must succeed and return the exact same shape
    expect(nonExistentResult).toEqual({
      success: true,
      message: "Verification link generated.",
      data: { expiresInSeconds: 300 },
    });

    expect(unverifiedResult).toEqual(nonExistentResult);
    expect(verifiedResult).toEqual(nonExistentResult);
  });
});

// ---------------------------------------------------------------------------
// The verification URL is ONLY observable via the event bus
// ---------------------------------------------------------------------------

describe("AuthService.regenerateVerificationLink — event bus", () => {
  /**
   * The verificationUrl must travel exclusively through the event bus so
   * that email delivery is the only channel that exposes it to the user.
   */
  it("publishes a VerificationLinkRequestedEvent whose payload carries the URL", async () => {
    const container = new AppContainer();
    const email = await registerUnverifiedOrgAdmin(container);
    const publishSpy = vi.spyOn(container.eventBus, "publish");

    await container.authService.regenerateVerificationLink(email);

    const linkCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof VerificationLinkRequestedEvent,
    );

    expect(linkCall).toBeDefined();

    const event = linkCall![0] as VerificationLinkRequestedEvent;
    expect(event.payload).toHaveProperty("verificationUrl");
    expect(typeof event.payload.verificationUrl).toBe("string");
    expect(event.payload.verificationUrl).toMatch(/^https?:\/\//);
  });

  it("does NOT publish a VerificationLinkRequestedEvent for a non-existent email", async () => {
    const container = new AppContainer();
    const publishSpy = vi.spyOn(container.eventBus, "publish");

    await container.authService.regenerateVerificationLink("ghost-bus@test.com");

    const linkCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof VerificationLinkRequestedEvent,
    );
    expect(linkCall).toBeUndefined();
  });

  it("does NOT publish a VerificationLinkRequestedEvent for an already-verified email", async () => {
    const container = new AppContainer();
    const { user: verifiedUser } = await UserFactory.create({ isVerified: true });
    const publishSpy = vi.spyOn(container.eventBus, "publish");

    await container.authService.regenerateVerificationLink(verifiedUser.email);

    const linkCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof VerificationLinkRequestedEvent,
    );
    expect(linkCall).toBeUndefined();
  });
});
