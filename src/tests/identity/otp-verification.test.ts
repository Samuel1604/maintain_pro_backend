import { describe, it, expect, vi } from "vitest";
import { AppContainer } from "@/container/app.container.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import {
  OtpRequestedEvent,
  EmailVerifiedEvent,
} from "@/modules/identity/events/index.js";
import { OtpPurpose } from "@/modules/identity/otp/otp.types.js";
import { ValidationException, BusinessException } from "@/shared/errors/index.js";

const sessionMeta = { ipAddress: "127.0.0.1", userAgent: "vitest-agent" };

async function registerUnverifiedOrgAdmin(container: AppContainer) {
  const suffix = Math.floor(Math.random() * 100000);
  const payload = {
    organizationName: `Otp Test Org ${suffix}`,
    industry: "Facilities Management",
    email: `otp-user-${suffix}@test.com`,
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
  };

  const publishSpy = vi.spyOn(container.eventBus, "publish");

  await container.authService.registerOrganization(payload, sessionMeta);

  const otpCall = publishSpy.mock.calls.find(
    ([event]) => event instanceof OtpRequestedEvent,
  );
  const otp = (otpCall![0] as OtpRequestedEvent).payload.otp!;

  publishSpy.mockRestore();

  return { email: payload.email, otp };
}

describe("AuthService.verifyEmail", () => {
  it("marks the account verified and publishes EmailVerifiedEvent given the correct OTP", async () => {
    const container = new AppContainer();
    const { email, otp } = await registerUnverifiedOrgAdmin(container);

    const publishSpy = vi.spyOn(container.eventBus, "publish");

    const result = await container.authService.verifyEmail(email, otp);

    expect(result.success).toBe(true);

    const user = await container.userReader.findByEmail(email);
    expect(user!.isVerified).toBe(true);

    const verifiedCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof EmailVerifiedEvent,
    );
    expect(verifiedCall).toBeDefined();
  });

  it("rejects an incorrect OTP without verifying the account", async () => {
    const container = new AppContainer();
    const { email } = await registerUnverifiedOrgAdmin(container);

    await expect(
      container.authService.verifyEmail(email, "000000"),
    ).rejects.toBeInstanceOf(ValidationException);

    const user = await container.userReader.findByEmail(email);
    expect(user!.isVerified).toBe(false);
  });

  it("rejects reuse of an already-consumed OTP", async () => {
    const container = new AppContainer();
    const { email, otp } = await registerUnverifiedOrgAdmin(container);

    await container.authService.verifyEmail(email, otp);

    await expect(
      container.authService.verifyEmail(email, otp),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});

describe("AuthService.resendVerificationOtp", () => {
  it("refuses to resend for an already-verified account", async () => {
    const container = new AppContainer();
    const { user } = await UserFactory.create({ isVerified: true });

    await expect(
      container.authService.resendVerificationOtp(user.email),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  /**
   * OtpService caps resends at 3 within its window (see otp.service.ts
   * MAX_RESENDS). This exercises that limit through the real
   * AuthService.resendVerificationOtp path rather than asserting on
   * OtpService directly, since the limit is what actually protects the
   * resend-otp endpoint from abuse.
   */
  it("enforces the resend limit for an unverified account", async () => {
    const container = new AppContainer();
    const { user } = await UserFactory.create({
      isVerified: false,
      status: "pending_verification",
    });

    await container.authService.resendVerificationOtp(user.email);
    await container.authService.resendVerificationOtp(user.email);
    await container.authService.resendVerificationOtp(user.email);

    await expect(
      container.authService.resendVerificationOtp(user.email),
    ).rejects.toBeInstanceOf(BusinessException);
  });

  it("issues a fresh OTP that verifies successfully, invalidating verification via the old one", async () => {
    const container = new AppContainer();
    const { email, otp: firstOtp } = await registerUnverifiedOrgAdmin(container);

    const publishSpy = vi.spyOn(container.eventBus, "publish");
    await container.authService.resendVerificationOtp(email);

    const otpCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof OtpRequestedEvent,
    );
    const secondOtp = (otpCall![0] as OtpRequestedEvent).payload.otp!;

    expect(secondOtp).not.toBe(firstOtp);

    // The old code is no longer valid once a new one has been issued.
    await expect(
      container.authService.verifyEmail(email, firstOtp),
    ).rejects.toBeInstanceOf(ValidationException);

    // The new code works.
    const result = await container.authService.verifyEmail(email, secondOtp);
    expect(result.success).toBe(true);
  });
});

describe("OtpPurpose isolation", () => {
  /**
   * OTPs are keyed by purpose (see otp.service.ts otpKey()), so an OTP
   * issued for email verification must not be usable to satisfy a
   * different purpose (e.g. password reset) for the same user.
   */
  it("does not let an email-verification OTP satisfy a password-reset check", async () => {
    const container = new AppContainer();
    const { email, otp } = await registerUnverifiedOrgAdmin(container);
    const user = await container.userReader.findByEmail(email);

    const valid = await container.otpService.verify(
      user!.id,
      OtpPurpose.PASSWORD_RESET,
      otp,
    );

    expect(valid).toBe(false);
  });
});
