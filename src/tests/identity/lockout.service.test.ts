import { describe, it, expect, vi } from "vitest";
import { AppContainer } from "@/container/app.container.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { UserLockedOutEvent } from "@/modules/identity/events/index.js";

const sessionMeta = { ipAddress: "127.0.0.1", userAgent: "vitest-agent" };

describe("LockoutService.isLocked", () => {
  /**
   * Regression test for: the published UserLockedOutEvent reported
   * `user.failedLoginAttempts + 1`, but `user` returned from
   * incrementFailedLoginAttempts() is already the post-increment document
   * (repository.increment uses returnDocument: "after") — so the event
   * (and the audit log / notification built from it) over-reported the
   * failed-attempt count by one.
   *
   * NOTE: this test previously called `isLocked()` in a loop without ever
   * incrementing `failedLoginAttempts` in between, so the count stayed at
   * 0 on every iteration and the lock threshold was never actually
   * crossed — the assertion below failed for a test-bug reason unrelated
   * to LockoutService itself. Fixed to increment before each check,
   * mirroring the real call order in AuthService.login() (increment on
   * every wrong-password attempt, then isLocked() to check/apply the
   * lock).
   */
  it("reports the exact failed-attempt count on the lockout event, with no off-by-one", async () => {
    const container = new AppContainer();
    const { user } = await UserFactory.create();

    const publishSpy = vi.spyOn(container.eventBus, "publish");

    // MAX_ATTEMPTS defaults to 5 — the 5th increment is the one that
    // actually crosses the threshold and triggers the lock.
    for (let i = 0; i < 5; i++) {
      const latestUser = (await container.userService.incrementFailedLoginAttempts(
        user._id.toString(),
      ))!;
      await container.lockoutService.isLocked(latestUser, sessionMeta);
    }

    const lockoutEventCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof UserLockedOutEvent,
    );

    expect(lockoutEventCall).toBeDefined();
    const payload = (lockoutEventCall![0] as UserLockedOutEvent).payload;
    expect(payload.failedLoginAttempts).toBe(5);
  });

  it("does not publish a lockout event before the attempt threshold is reached", async () => {
    const container = new AppContainer();
    const { user } = await UserFactory.create();

    const publishSpy = vi.spyOn(container.eventBus, "publish");

    const incremented = (await container.userService.incrementFailedLoginAttempts(
      user._id.toString(),
    ))!;
    await container.lockoutService.isLocked(incremented, sessionMeta);

    const lockoutEventCall = publishSpy.mock.calls.find(
      ([event]) => event instanceof UserLockedOutEvent,
    );
    expect(lockoutEventCall).toBeUndefined();
  });
});

describe("LockoutService.isUnlocked", () => {
  it("is a no-op for an account with no failed-attempt history", async () => {
    const container = new AppContainer();
    const { user } = await UserFactory.create();

    // Should not throw, and should not need any DB write for a clean account.
    await expect(
      container.lockoutService.isUnlocked(user),
    ).resolves.toBeUndefined();
  });
});
