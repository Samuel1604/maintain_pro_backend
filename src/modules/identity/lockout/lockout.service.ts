import { UserReader } from "@/modules/users/user.reader.js";
import { UserService } from "@/modules/users/user.service.js";
import { AuthorizationException } from "@/shared/errors/index.js";
import type { IUser } from "@/modules/users/user.types.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import type { EventBus } from "@/infrastructure/events/bus/event-bus.interface.js";
import { UserLockedOutEvent } from "@/modules/identity/events/index.js";
import type { SessionMetadata } from "@/shared/types/session.types.js";

export class LockoutService {
  constructor(
    private readonly userService: UserService,
    private readonly userReader: UserReader,
    private readonly auditLogService: AuditLogService,
    private readonly eventBus: EventBus,
    private readonly MAX_ATTEMPTS = 5,
    private readonly LOCK_MINUTES = 10,
  ) {}

  async isNotLocked(data: IUser) {
    const user = await this.userReader.getRequiredUser(data.email);

    if (!user) {
      return;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AuthorizationException(
        "Account temporarily locked. Try again later.",
        {
          statusCode: 423,
          code: "ACCOUNT_LOCKED",
        },
      );
    }
  }

  async isLocked(data: IUser, session: SessionMetadata) {
    const user = await this.userReader.getRequiredUser(
      data.email,
    );

    if (!user) {
      return;
    }

    if (user.failedLoginAttempts >= this.MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + this.LOCK_MINUTES * 60 * 1000);

      await this.userService.lockAccount(user._id.toString(), lockedUntil);

      /**
       * Publish only. Security-alert creation, audit logging, and the
       * "your account was locked" notification are handled by
       * SecurityListener / AuditLogListener / EmailListener, all
       * subscribed to USER_LOCKED_OUT — see container/app.container.ts.
       */
      await this.eventBus.publish(
        new UserLockedOutEvent({
          userId: user._id.toString(),
          email: user.email,
          // `user` is already the post-increment document (repository.increment
          // uses returnDocument: "after"), so failedLoginAttempts already
          // reflects this failed attempt. Do not add 1 here — doing so
          // over-reports the count by one in the lockout notification/audit log.
          failedLoginAttempts: user.failedLoginAttempts,
          lockedUntil: lockedUntil.toISOString(),
          sessionMetadata: session,
        }),
      );
    }
  }

  /**
   * Resets failed-login state after a successful login.
   *
   * Called on every successful login (verified + active), so it must be a
   * no-op — no DB write, no audit entry — for the common case of an account
   * that had no failed-attempt state at all. It previously unconditionally
   * wrote to the DB and logged an "account_unlocked" audit entry on every
   * single login, polluting the audit trail with false "unlock" events for
   * accounts that were never locked.
   *
   * We still clear a stray non-zero `failedLoginAttempts` counter (below the
   * lockout threshold) silently, since that's just normal counter hygiene.
   * We only write the "account_unlocked" audit entry when the account was
   * genuinely locked (`lockedUntil` was set) — that's the case worth an
   * audit trail entry.
   */
  async isUnlocked(data: IUser) {
    const hadFailedAttempts = data.failedLoginAttempts > 0;
    const wasActuallyLocked = Boolean(data.lockedUntil);

    if (!hadFailedAttempts && !wasActuallyLocked) {
      return;
    }

    await this.userService.unlockAccount(data._id.toString());

    if (!wasActuallyLocked) {
      return;
    }

    await this.auditLogService.log({
      actorId: data._id,

      targetUserId: data._id,

      action: "account_unlocked",

      entityType: "user",

      entityId: data._id,
    });
  }
}
