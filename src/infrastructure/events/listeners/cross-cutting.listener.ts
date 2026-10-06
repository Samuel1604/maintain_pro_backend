import { Types } from "mongoose";
import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import { NotificationPolicyService } from "@/modules/notifications/notification-policy.service.js";
import { User } from "@/modules/users/user.model.js";
import type { NotificationType } from "@/modules/notifications/notification.model.js";

export class CrossCuttingEventListener implements EventHandler<DomainEvent> {
  constructor(
    private readonly audit: AuditLogService,
    private readonly notifications: NotificationPolicyService,
  ) {}

  async handle(event: DomainEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const organizationId = event.organizationId ?? String(payload.organizationId ?? "");
    const actorId = event.actorId ?? String(payload.actorId ?? payload.performedBy ?? "");
    const vendorContext = event.vendorId ?? String(payload.vendorId ?? "");
    if (
      ((!organizationId || !Types.ObjectId.isValid(organizationId)) && !vendorContext) ||
      (vendorContext && !Types.ObjectId.isValid(vendorContext))
    )
      return;

    if (event.name === "LowStockDetected") {
      const recipients = await User.find({
        organizationId,
        role: { $in: ["admin", "facility_manager"] },
        status: "active",
      }).select("_id");
      await Promise.all(
        recipients.map((recipient) =>
          this.notifications.notifyUser({
            recipientId: recipient._id.toString(),
            actorId,
            organizationId,
            type: "inventory",
            title: "Low inventory stock",
            message: `${String(payload.itemName)} has ${String(payload.availableQuantity)} available units remaining.`,
            resourceType: "inventory_item",
            resourceId: String(payload.itemId),
            idempotencyKey: `inventory:low-stock:${String(payload.itemId)}:${recipient._id.toString()}`,
            sendPush: false,
          }),
        ),
      );
      return;
    }

    if (event.name === "ProcurementNotificationRequested") {
      const filter =
        payload.audience === "vendor"
          ? { vendorId: payload.vendorId, role: { $in: ["vendor_lead", "vendor_manager"] } }
          : { organizationId, role: { $in: ["admin", "facility_manager"] } };
      const recipients = await User.find({ ...filter, status: "active" } as Record<
        string,
        unknown
      >).select("_id");
      await Promise.all(
        recipients
          .filter((recipient) => recipient._id.toString() !== actorId)
          .map((recipient) =>
            this.notifications.notifyUser({
              recipientId: recipient._id.toString(),
              actorId,
              organizationId,
              vendorId: payload.vendorId ? String(payload.vendorId) : undefined,
              type: "procurement",
              title: String(payload.title),
              message: String(payload.message),
              resourceType: "procurement",
              resourceId: String(payload.resourceId),
              idempotencyKey: `procurement:${event.eventId}:${recipient._id.toString()}`,
              sendPush: false,
            }),
          ),
      );
      return;
    }

    if (event.name === "identity.invitation.created") {
      const invitationFacilityId = String(payload.facilityId ?? "");
      const invitationVendorId = String(payload.vendorId ?? event.vendorId ?? "");
      const recipientFilter: Record<string, unknown> = invitationVendorId
        ? {
            vendorId: invitationVendorId,
            role: { $in: ["vendor_lead", "vendor_manager"] },
            status: "active",
          }
        : {
            organizationId,
            status: "active",
            $or: [
              { role: "admin" },
              ...(invitationFacilityId
                ? [{ role: "facility_manager", facilityId: invitationFacilityId }]
                : []),
            ],
          };
      const recipients = await User.find(recipientFilter).select("_id");
      await Promise.all(
        recipients
          .filter((recipient) => recipient._id.toString() !== actorId)
          .map((recipient) =>
            this.notifications.notifyUser({
              recipientId: recipient._id.toString(),
              actorId,
              organizationId,
              ...(invitationVendorId ? { vendorId: invitationVendorId } : {}),
              type: "invitation",
              title: "New team invitation",
              message: `A ${String(payload.role ?? "team member")} invitation was created for ${String(payload.email)}.`,
              resourceType: "invitation",
              resourceId: String(payload.invitationId ?? event.aggregateId ?? ""),
              idempotencyKey: `invitation:${String(payload.invitationId)}:${recipient._id.toString()}`,
              sendPush: false,
            }),
          ),
      );
      return;
    }

    if (event.name !== "NotificationCreated") {
      const notification = notificationForEvent(event.name, payload);
      if (notification) {
        const recipients = await User.find({
          ...(payload.vendorId || event.vendorId
            ? {
                vendorId: String(payload.vendorId ?? event.vendorId),
                role: { $in: ["vendor_lead", "vendor_manager"] },
              }
            : {
                organizationId,
                role: { $in: ["admin", "facility_manager", "finance", "technician", "staff"] },
              }),
          status: "active",
        }).select("_id");
        await Promise.all(
          recipients
            .filter((recipient) => recipient._id.toString() !== actorId)
            .map((recipient) =>
              this.notifications.notifyUser({
                recipientId: recipient._id.toString(),
                actorId,
                organizationId,
                vendorId: event.vendorId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                resourceType: event.aggregateType,
                resourceId: event.aggregateId,
                idempotencyKey: `event:${event.eventId}:${recipient._id.toString()}`,
                sendPush: false,
              }),
            ),
        );
      }
    }

    const entityId = payload.entityId;
    if (
      !entityId ||
      !Types.ObjectId.isValid(String(entityId)) ||
      !actorId ||
      !Types.ObjectId.isValid(actorId)
    )
      return;
    await this.audit.log({
      actorId: new Types.ObjectId(actorId),
      organizationId: new Types.ObjectId(organizationId),
      entityType: event.aggregateType === "inventory" ? "inventory" : "procurement",
      entityId: new Types.ObjectId(String(entityId)),
      action: String(payload.action) as never,
      outcome: "success",
      severity: "info",
      metadata: { eventId: event.eventId, eventName: event.name, ...payload },
      source: event.aggregateType ?? "domain-event",
    });
  }
}

function notificationForEvent(
  name: string,
  payload: Record<string, unknown>,
): { type: NotificationType; title: string; message: string } | undefined {
  if (name.startsWith("WorkOrder"))
    return {
      type: "work_order",
      title: "Work order update",
      message: `Work order ${String(payload.workOrderId ?? payload.entityId ?? "")} was updated.`,
    };
  if (name.startsWith("ServiceRequest"))
    return {
      type: "service_request",
      title: "Service request update",
      message: `Service request ${String(payload.serviceRequestId ?? payload.entityId ?? "")} was updated.`,
    };
  if (name.startsWith("PreventiveMaintenance"))
    return {
      type: "system",
      title: "Maintenance schedule update",
      message: "A preventive maintenance schedule was updated.",
    };
  if (name.startsWith("VendorApplication") || name.startsWith("VendorOpportunity"))
    return {
      type: "procurement",
      title: "Vendor marketplace update",
      message: "A vendor marketplace record needs your attention.",
    };
  if (name === "VendorRelationshipRequested")
    return {
      type: "procurement",
      title: "New organization connection request",
      message: "An organization wants to connect with your vendor account.",
    };
  if (name.startsWith("Quotation") || name.startsWith("ContractAward") || name.startsWith("SLA"))
    return {
      type: "billing",
      title: "Commercial update",
      message: "A quotation, contract, or SLA record was updated.",
    };
  if (name.startsWith("Invoice"))
    return {
      type: "billing",
      title: "Invoice update",
      message: "An invoice requires your attention.",
    };
  if (name.startsWith("Inventory") || name.startsWith("Stock"))
    return {
      type: "inventory",
      title: "Inventory update",
      message: "An inventory record was updated.",
    };
  if (name.includes("Invitation"))
    return {
      type: "invitation",
      title: "Invitation update",
      message: "An organization invitation requires your attention.",
    };
  return undefined;
}
