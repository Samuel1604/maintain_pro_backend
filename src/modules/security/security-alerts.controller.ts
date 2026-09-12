import { Types } from "mongoose";
import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { SecurityService } from "./security.service.js";
import type { AlertIdParamsDto } from "./security-alerts.schema.js";

export class SecurityAlertsController {
  constructor(private readonly securityService: SecurityService) {}

  /**
   * List the current user's security alerts.
   */
  listAlerts = requestHandler<AuthRequest>(async (req, res) => {
    const alerts = await this.securityService.getUserAlerts(
      new Types.ObjectId(req.user.userId),
    );

    return res.ok(alerts, "Security alerts retrieved");
  });

  /**
   * Unread alert count — for a notification badge.
   */
  getUnreadCount = requestHandler<AuthRequest>(async (req, res) => {
    const count = await this.securityService.getUnreadCount(
      new Types.ObjectId(req.user.userId),
    );

    return res.ok({ count }, "Unread count retrieved");
  });

  /**
   * Mark a single alert read. Scoped to the requesting user — an alert
   * that exists but belongs to someone else 404s exactly like one that
   * doesn't exist, so this can't be used to enumerate other users'
   * alert ids.
   */
  markRead = requestHandler<AuthRequest<AlertIdParamsDto>>(async (req, res) => {
    const { id } = req.validated.params;

    const alert = await this.securityService.markRead(
      new Types.ObjectId(id),
      new Types.ObjectId(req.user.userId),
    );

    return res.ok(alert, "Alert marked as read");
  });

  /**
   * Mark every unread alert for the current user as read.
   */
  markAllRead = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.securityService.markAllRead(
      new Types.ObjectId(req.user.userId),
    );

    return res.ok(null, result.message);
  });

  /**
   * Dismiss a single alert. Scoped to the requesting user, same as
   * markRead above.
   */
  dismiss = requestHandler<AuthRequest<AlertIdParamsDto>>(async (req, res) => {
    const { id } = req.validated.params;

    const alert = await this.securityService.dismiss(
      id,
      new Types.ObjectId(req.user.userId),
    );

    return res.ok(alert, "Alert dismissed");
  });
}
