import type { Types } from "mongoose";
import { SecurityAlert } from "./security.model.js";
import {
  SecurityAlertStatus,
  type ISecurityAlert,
} from "./security.types.js";

export class SecurityAlertRepository {
  async create(data: Partial<ISecurityAlert>) {
    return SecurityAlert.create(data);
  }

  async findByUser(userId: Types.ObjectId) {
    return SecurityAlert.find({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  async findById(alertId: string) {
    return SecurityAlert.findById(alertId);
  }

  async dismiss(alertId: string) {
    return SecurityAlert.findByIdAndUpdate(
      alertId,
      {
        status: SecurityAlertStatus.DISMISSED,
      },
      {
        new: true,
      },
    );
  }

  async countUnread(userId: Types.ObjectId) {
    return SecurityAlert.countDocuments({
      userId,

      status: SecurityAlertStatus.UNREAD,
    });
  }

  async markRead(alertId: Types.ObjectId) {
    return SecurityAlert.findByIdAndUpdate(
      alertId,

      {
        status: SecurityAlertStatus.READ,

        readAt: new Date(),
      },

      {
        new: true,
      },
    );
  }

  async markAllRead(userId: Types.ObjectId) {
    return SecurityAlert.updateMany(
      {
        userId,

        status: SecurityAlertStatus.UNREAD,
      },

      {
        status: SecurityAlertStatus.READ,

        readAt: new Date(),
      },
    );
  }
}
