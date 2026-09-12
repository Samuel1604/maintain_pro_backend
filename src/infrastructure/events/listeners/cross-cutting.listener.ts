import { Types } from "mongoose";
import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import { NotificationPolicyService } from "@/modules/notifications/notification-policy.service.js";
import { User } from "@/modules/users/user.model.js";

export class CrossCuttingEventListener implements EventHandler<DomainEvent> {
  constructor(private readonly audit: AuditLogService, private readonly notifications: NotificationPolicyService) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const organizationId = event.organizationId ?? String(payload.organizationId ?? "");
    const actorId = event.actorId ?? String(payload.actorId ?? payload.performedBy ?? "");
    if (!organizationId || !Types.ObjectId.isValid(organizationId)) return;

    if (event.name === "LowStockDetected") {
      const recipients = await User.find({ organizationId, role: { $in: ["admin", "facility_manager"] }, status: "active" }).select("_id");
      await Promise.all(recipients.map((recipient) => this.notifications.notifyUser({ recipientId: recipient._id.toString(), actorId, organizationId, type: "inventory", title: "Low inventory stock", message: `${String(payload.itemName)} has ${String(payload.availableQuantity)} available units remaining.`, resourceType: "inventory_item", resourceId: String(payload.itemId), idempotencyKey: `inventory:low-stock:${String(payload.itemId)}:${recipient._id.toString()}`, sendPush: false })));
      return;
    }

    if (event.name === "ProcurementNotificationRequested") {
      const filter = payload.audience === "vendor" ? { vendorId: payload.vendorId, role: { $in: ["vendor_lead", "vendor_manager"] } } : { organizationId, role: { $in: ["admin", "facility_manager"] } };
      const recipients = await User.find({ ...filter, status: "active" } as Record<string, unknown>).select("_id");
      await Promise.all(recipients.filter((recipient) => recipient._id.toString() !== actorId).map((recipient) => this.notifications.notifyUser({ recipientId: recipient._id.toString(), actorId, organizationId, vendorId: payload.vendorId ? String(payload.vendorId) : undefined, type: "procurement", title: String(payload.title), message: String(payload.message), resourceType: "procurement", resourceId: String(payload.resourceId), idempotencyKey: `procurement:${event.eventId}:${recipient._id.toString()}`, sendPush: false })));
      return;
    }

    const entityId = payload.entityId;
    if (!entityId || !Types.ObjectId.isValid(String(entityId)) || !actorId || !Types.ObjectId.isValid(actorId)) return;
    await this.audit.log({ actorId: new Types.ObjectId(actorId), organizationId: new Types.ObjectId(organizationId), entityType: event.aggregateType === "inventory" ? "inventory" : "procurement", entityId: new Types.ObjectId(String(entityId)), action: String(payload.action) as never, outcome: "success", severity: "info", metadata: { eventId: event.eventId, eventName: event.name, ...payload }, source: event.aggregateType ?? "domain-event" });
  }
}
