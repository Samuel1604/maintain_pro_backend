import { SecurityAlertRepository } from "./security.repository.js";
import type { CreateSecurityAlertDto } from "./security.dto.js";
import { SecurityAlertStatus } from "./security.types.js";
import { AppError } from "@/shared/errors/AppError.js";
import type { Types } from "mongoose";

export class SecurityAlertService {
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

  async markRead(alertId: Types.ObjectId) {
    const alert = await this.repository.markRead(alertId);

    if (!alert) {
      throw new AppError("Security alert not found", 404);
    }

    return alert;
  }

  async markAllRead(userId: Types.ObjectId) {
    await this.repository.markAllRead(userId);

    return {
      message: "All alerts marked as read",
    };
  }

  async dismiss(alertId: string) {
    const alert = await this.repository.dismiss(alertId);

    if (!alert) {
      throw new AppError("Security alert not found", 404);
    }

    return alert;
  }
}
