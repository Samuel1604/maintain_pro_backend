import { toObjectId } from "@/shared/validators/objectId.js";
import { UserService } from "@/modules/users/user.service.js";
import { AppError } from "@/shared/errors/AppError.js";
import type { IUser } from "@/modules/users/user.types.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import { SecurityAlertService } from "@/modules/security/security.service.js";
import { SecurityAlertType } from "@/modules/security/security.types.js";
import type { SessionMetadata } from "@/shared/types/session.types.js";

export class LockoutService {
  constructor(
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
    private readonly securityAlertService: SecurityAlertService,
    private readonly MAX_ATTEMPTS = 5,
    private readonly LOCK_MINUTES = 15,
  ) {}

  async isNotLocked(data: IUser) {
    const user = await this.userService.findById(data._id.toString());

    if (!user) {
      return;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError("Account temporarily locked. Try again later.", 423);
    }
  }

  async isLocked(data: IUser, session: SessionMetadata) {
    const user = await this.userService.incrementFailedLoginAttempts(
      data._id.toString(),
    );

    if (!user) {
      return;
    }

    if (user.failedLoginAttempts >= this.MAX_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + this.LOCK_MINUTES * 60 * 1000);

      await this.userService.lockAccount(user.id, lockedUntil);

      await this.securityAlertService.createAlert({
        userId: user._id,

        type: SecurityAlertType.ACCOUNT_LOCKED,

        sessionMetadata: session,

        metadata: {
          failedLoginAttempts: user.failedLoginAttempts + 1,

          lockedUntil,
        },
      });

      await this.auditLogService.log({
        actorId: toObjectId(user.id),

        targetUserId: toObjectId(user.id),

        action: "account_locked",

        entityType: "user",

        entityId: toObjectId(user.id),

        severity: "warning",

        metadata: {
          lockedUntil,
          failedAttempts: user.failedLoginAttempts,
        },
      });
    }
  }

  async isUnlocked(data: IUser) {
    await this.userService.unlockAccount(data._id.toString());
    await this.auditLogService.log({
      actorId: data._id,

      targetUserId: data._id,

      action: "account_unlocked",

      entityType: "user",

      entityId: data._id,
    });
  }
}
