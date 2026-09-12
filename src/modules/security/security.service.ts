import { SecurityAlertRepository } from "./security.repository.js";
import type { CreateSecurityAlertDto } from "./security.dto.js";
import { SecurityAlertStatus } from "./security.types.js";
import { NotFoundException } from "@/shared/errors/index.js";
import type { Types } from "mongoose";

export class SecurityService {
  constructor(private readonly repository: SecurityAlertRepository) {}

  async createAlert(dto: CreateSecurityAlertDto) {
    return this.repository.create({
      userId: dto.userId,

      type: dto.type,

      status: SecurityAlertStatus.UNREAD,

      ipAddress: dto.sessionMetadata?.ipAddress,

      userAgent: dto.sessionMetadata?.userAgent,

      country: dto.sessionMetadata?.country,

      city: dto.sessionMetadata?.city,

      metadata: dto.metadata,
    });
  }

  async getUserAlerts(userId: Types.ObjectId) {
    return this.repository.findByUser(userId);
  }

  async getUnreadCount(userId: Types.ObjectId) {
    return this.repository.countUnread(userId);
  }

  async markRead(alertId: Types.ObjectId, userId: Types.ObjectId) {
    const alert = await this.repository.markRead(alertId, userId);

    if (!alert) {
      // Also hit when the alert exists but belongs to someone else —
      // deliberately indistinguishable from "doesn't exist" so this
      // endpoint can't be used to probe other users' alert IDs.
      throw new NotFoundException("Security alert not found");
    }

    return alert;
  }

  async markAllRead(userId: Types.ObjectId) {
    await this.repository.markAllRead(userId);

    return {
      message: "All alerts marked as read",
    };
  }

  async dismiss(alertId: string, userId: Types.ObjectId) {
    const alert = await this.repository.dismiss(alertId, userId);

    if (!alert) {
      throw new NotFoundException("Security alert not found");
    }

    return alert;
  }
}
