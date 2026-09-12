import { describe, it, expect, vi } from "vitest";
import { AppContainer } from "@/container/app.container.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { PasswordResetRequestedEvent } from "@/modules/identity/events/index.js";

const sessionMeta = { ipAddress: "127.0.0.1", userAgent: "vitest-agent" };

/**
 * Session revocation on password change/reset runs via a queued event
 * listener (SessionSecurityListener), dispatched asynchronously through
 * BullMQ/Redis rather than inline — so we poll briefly for it to land
 * instead of asserting immediately.
 */
async function waitUntil(
  check: () => Promise<boolean>,
  { timeoutMs = 5000, intervalMs = 50 } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitUntil: condition not met within ${timeoutMs}ms`);
}

describe("Session revocation on password change (self-service)", () => {
  /**
   * Audit finding: neither changePassword nor resetPassword revoked other
   * active sessions, so a stolen session survived a password change/reset.
   * Fixed via SessionSecurityListener, subscribed to PASSWORD_CHANGED /
   * PASSWORD_RESET_COMPLETED (see container/app.container.ts).
   */
  it("invalidates the session that performed the change once the password change completes", async () => {
    const container = new AppContainer();
    const { user, rawPassword } = await UserFactory.create();

    const loginResult = await container.authService.login(
      { email: user.email, password: rawPassword },
      sessionMeta,
    );
    if (!loginResult.data) throw new Error("Login did not return auth data");
    const { refreshToken, sessionId } = loginResult.data;

    await container.userService.changePassword(
      user._id.toString(),
      rawPassword,
      "BrandNewPassword123!",
    );

    await waitUntil(async () => {
      try {
        await container.sessionService.refresh(refreshToken, {
          ...sessionMeta,
          sessionId,
        });
        return false; // refresh still succeeded — not revoked yet
      } catch {
        return true; // refresh now rejected — revoked
      }
    });
  });
});

describe("Session revocation on password reset (forgot-password flow)", () => {
  it("invalidates a pre-existing session once an unrelated password reset completes", async () => {
    const container = new AppContainer();
    const { user, rawPassword } = await UserFactory.create();

    // Simulate a session that may have been established by someone other
    // than the legitimate account owner (the exact scenario forgot-password
    // exists to recover from).
    const loginResult = await container.authService.login(
      { email: user.email, password: rawPassword },
      sessionMeta,
    );
    if (!loginResult.data) throw new Error("Login did not return auth data");
    const { refreshToken, sessionId } = loginResult.data;

    const publishSpy = vi.spyOn(container.eventBus, "publish");
    await container.userService.requestResetPassword(
      user.email,
      "198.51.100.10",
    );
    const resetCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof PasswordResetRequestedEvent,
    );
    const otp = (resetCall![0] as PasswordResetRequestedEvent).payload.otp!;

    await container.userService.resetPassword(
      user.email,
      otp,
      "BrandNewPassword123!",
    );

    await waitUntil(async () => {
      try {
        await container.sessionService.refresh(refreshToken, {
          ...sessionMeta,
          sessionId,
        });
        return false;
      } catch {
        return true;
      }
    });
  });

  it("does not error when there is no active session to revoke", async () => {
    const container = new AppContainer();
    const { user } = await UserFactory.create();

    const publishSpy = vi.spyOn(container.eventBus, "publish");
    await container.userService.requestResetPassword(
      user.email,
      "198.51.100.11",
    );
    const resetCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof PasswordResetRequestedEvent,
    );
    const otp = (resetCall![0] as PasswordResetRequestedEvent).payload.otp!;

    // No session exists for this user at all — logoutAll's "no active
    // sessions" case must be handled gracefully by the listener rather
    // than surfacing as a job failure.
    await expect(
      container.userService.resetPassword(
        user.email,
        otp,
        "BrandNewPassword123!",
      ),
    ).resolves.toMatchObject({ message: expect.stringMatching(/reset successfully/i) });
  });
});
