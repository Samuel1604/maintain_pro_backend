import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { NotificationPolicyService } from "./notification-policy.service.js";
import { toNotificationResponse } from "./notification.dto.js";
import { NotificationPreferenceService } from "./notification-preference.service.js";
import { preferenceSchema, escalationRuleSchema } from "./notification-preference.schema.js";

const service = new NotificationPolicyService();
const preferenceService = new NotificationPreferenceService();

export const listNotifications = requestHandler<AuthRequest>(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await service.getUserNotifications(req.user.userId, page, limit, {
    organizationId: req.user.organizationId,
    unread: req.query.unread === "true" ? true : req.query.unread === "false" ? false : undefined,
    type: typeof req.query.type === "string" ? req.query.type : undefined,
    priority: typeof req.query.priority === "string" ? req.query.priority : undefined,
  });
  return res.ok({ data: result.data.map(toNotificationResponse), pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } }, "Notifications retrieved");
});

export const unreadCount = requestHandler<AuthRequest>(async (req, res) => res.ok({ count: await service.getUnreadCount(req.user.userId) }, "Unread notification count retrieved"));
export const markRead = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(toNotificationResponse(await service.markAsRead(req.params.id, req.user.userId)), "Notification marked as read"));
export const markAllRead = requestHandler<AuthRequest>(async (req, res) => { await service.markAllAsRead(req.user.userId); return res.ok(null, "Notifications marked as read"); });
export const getPreferences = requestHandler<AuthRequest>(async (req, res) => res.ok(await preferenceService.getPreferences(req.user), "Notification preferences retrieved"));
export const updatePreferences = requestHandler<AuthRequest>(async (req, res) => res.ok(await preferenceService.updatePreferences(preferenceSchema.parse(req.body), req.user), "Notification preferences updated"));
export const listEscalationRules = requestHandler<AuthRequest>(async (req, res) => res.ok(await preferenceService.listEscalationRules(req.user), "Escalation rules retrieved"));
export const createEscalationRule = requestHandler<AuthRequest>(async (req, res) => res.created(await preferenceService.createEscalationRule(escalationRuleSchema.parse(req.body), req.user), "Escalation rule created"));
export const updateEscalationRule = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => res.ok(await preferenceService.updateEscalationRule(req.params.id, escalationRuleSchema.partial().parse(req.body), req.user), "Escalation rule updated"));
export const deleteEscalationRule = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => { await preferenceService.deleteEscalationRule(req.params.id, req.user); return res.ok(null, "Escalation rule deleted"); });
