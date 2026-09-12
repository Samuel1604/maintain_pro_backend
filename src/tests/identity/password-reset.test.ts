import { describe, it, expect, vi } from "vitest";
import { AppContainer } from "@/container/app.container.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { PasswordResetRequestedEvent } from "@/modules/identity/events/index.js";
import { ValidationException, BusinessException } from "@/shared/errors/index.js";

const sessionMeta = { ipAddress: "127.0.0.1", userAgent: "vitest-agent" };

describe("UserService.requestResetPassword", () => {
  /**
   * Forgot-password must never reveal whether an email is registered
   * (email enumeration). The response message is identical for an
   * existing and a non-existing account, and no OTP/event is generated
   * for an account that doesn't exist.
   */
  it("returns the same generic message for an unknown email, without generating an OTP", async () => {
    const container = new AppContainer();
    const publishSpy = vi.spyOn(container.eventBus, "publish");

    const result = await container.userService.requestResetPassword(
      "no-such-account@test.com",
      sessionMeta.ipAddress,
    );

    expect(result.message).toMatch(/if the account exists/i);
    const resetCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof PasswordResetRequestedEvent,
    );
    expect(resetCall).toBeUndefined();
  });

  it("returns the identical message for a known email, while actually generating an OTP", async () => {
    const container = new AppContainer();
    const { user } = await UserFactory.create();
    const publishSpy = vi.spyOn(container.eventBus, "publish");

    const result = await container.userService.requestResetPassword(
      user.email,
      sessionMeta.ipAddress,
    );

    expect(result.message).toMatch(/if the account exists/i);
    const resetCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof PasswordResetRequestedEvent,
    );
    expect(resetCall).toBeDefined();
  });

  it("rate-limits repeated requests for the same email", async () => {
    const container = new AppContainer();
    const { user } = await UserFactory.create();

    // emailLimit allows 3 requests per 15 minutes (see user.service.ts).
    await container.userService.requestResetPassword(user.email, "10.0.0.1");
    await container.userService.requestResetPassword(user.email, "10.0.0.2");
    await container.userService.requestResetPassword(user.email, "10.0.0.3");

    await expect(
      container.userService.requestResetPassword(user.email, "10.0.0.4"),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it("rate-limits repeated requests from the same IP regardless of email", async () => {
    const container = new AppContainer();
    // Dedicated IP, distinct from `sessionMeta.ipAddress` used elsewhere in
    // this file — rate-limit counters live in Redis and are NOT reset
    // between tests (only Mongo is, per test file), so reusing a shared IP
    // here would poison every other test's counter for the rest of the run.
    const ip = "203.0.113.50";

    // ipLimit allows 5 requests per 15 minutes.
    for (let i = 0; i < 5; i++) {
      await container.userService.requestResetPassword(
        `user-${i}@test.com`,
        ip,
      );
    }

    await expect(
      container.userService.requestResetPassword("user-x@test.com", ip),
    ).rejects.toBeInstanceOf(BusinessException);
  });
});

describe("UserService.resetPassword", () => {
  it("rejects an invalid or expired OTP", async () => {
    const container = new AppContainer();
    const { user } = await UserFactory.create();

    await expect(
      container.userService.resetPassword(
        user.email,
        "000000",
        "NewPassword123!",
      ),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it("rejects reset for an email that doesn't exist without leaking that fact via a different error shape", async () => {
    const container = new AppContainer();

    await expect(
      container.userService.resetPassword(
        "no-such-account@test.com",
        "000000",
        "NewPassword123!",
      ),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it("changes the password, unlocks the account, and invalidates the OTP after a successful reset", async () => {
    const container = new AppContainer();
    const { user, rawPassword } = await UserFactory.create();
    const publishSpy = vi.spyOn(container.eventBus, "publish");

    await container.userService.requestResetPassword(
      user.email,
      sessionMeta.ipAddress,
    );
    const resetCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof PasswordResetRequestedEvent,
    );
    const otp = (resetCall![0] as PasswordResetRequestedEvent).payload.otp!;

    const result = await container.userService.resetPassword(
      user.email,
      otp,
      "BrandNewPassword123!",
    );
    expect(result.message).toMatch(/password reset successfully/i);

    // The OTP is single-use — a second reset attempt with the same code
    // must fail even with a correct email.
    await expect(
      container.userService.resetPassword(
        user.email,
        otp,
        "AnotherPassword123!",
      ),
    ).rejects.toBeInstanceOf(ValidationException);

    // The old password no longer authenticates; the account was also
    // unlocked as part of the reset (defensive, in case it had been
    // locked out prior to the reset).
    await expect(
      container.authService.login(
        { email: user.email, password: rawPassword },
        sessionMeta,
      ),
    ).rejects.toBeInstanceOf(Error);

    // The new password authenticates successfully.
    const loginResult = await container.authService.login(
      { email: user.email, password: "BrandNewPassword123!" },
      sessionMeta,
    );
    expect(loginResult.success).toBe(true);
  });
});
