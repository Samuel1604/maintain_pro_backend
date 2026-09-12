import type { Server } from "socket.io";
import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";

export interface RealtimeEventEnvelope {
  version: 1;
  eventId: string;
  name: string;
  occurredAt: string;
  aggregate?: { type: string; id: string };
  /** Identifiers only. Clients refetch authoritative API data after receipt. */
  payload: Record<string, string>;
}

/**
 * Transport adapter for domain events. It deliberately emits identifiers rather
 * than event payloads, which keeps persistence models and sensitive data off
 * the wire. It is a tap on the application process's event publication path;
 * queued workers continue to handle durable secondary reactions independently.
 */
export class RealtimePublisher {
  private io?: Server;

  attach(io: Server): void { this.io = io; }
  close(): void { this.io?.close(); this.io = undefined; }

  publish(event: DomainEvent): void {
    if (!this.io || !isRealtimeEvent(event.name)) return;
    const payload = identifiers(event);
    const envelope: RealtimeEventEnvelope = {
      version: 1, eventId: event.eventId, name: event.name,
      occurredAt: event.occurredAt.toISOString(), payload,
      ...(event.aggregateType && event.aggregateId ? { aggregate: { type: event.aggregateType, id: event.aggregateId } } : {}),
    };

    const rooms = new Set<string>();
    if (event.organizationId) rooms.add(`organization:${event.organizationId}`);
    if (payload.facilityId) rooms.add(`facility:${payload.facilityId}`);
    if (payload.vendorId) rooms.add(`vendor:${payload.vendorId}`);
    if (payload.assignedVendorId) rooms.add(`vendor:${payload.assignedVendorId}`);
    if (payload.assignedTechnicianId) rooms.add(`user:${payload.assignedTechnicianId}`);
    if (payload.recipientId) rooms.add(`user:${payload.recipientId}`);
    for (const room of rooms) this.io.to(room).emit("domain.event", envelope);
  }
}

const REALTIME_EVENTS = new Set([
  "WorkOrderCreated", "WorkOrderAssigned", "WorkOrderStatusChanged",
  "ServiceRequestCreated", "ServiceRequestApproved", "ServiceRequestRejected",
  "NotificationCreated", "PreventiveMaintenanceUpdated",
  "VendorApplicationSubmitted", "VendorApplicationStatusChanged",
  "PreventiveMaintenancePlanCreated", "PreventiveMaintenancePlanUpdated", "PreventiveMaintenancePlanCancelled",
  "PreventiveMaintenanceOccurrenceCreated", "PreventiveMaintenanceOccurrenceApproved",
  "PreventiveMaintenanceOccurrenceRejected", "PreventiveMaintenanceOccurrenceCancelled",
  "PreventiveMaintenanceOccurrenceAssignmentChanged", "PreventiveMaintenanceOccurrenceLinkedToWorkOrder",
  "InventoryItemCreated", "InventoryItemUpdated", "InventoryItemDeactivated",
  "StockReceived", "StockReserved", "StockReservationReleased", "StockIssued",
  "StockConsumed", "StockReturned", "StockAdjusted", "StockTransferred", "LowStockDetected",
]);

function isRealtimeEvent(name: string): boolean { return REALTIME_EVENTS.has(name); }

function identifiers(event: DomainEvent): Record<string, string> {
  const source = event.payload && typeof event.payload === "object" ? event.payload as Record<string, unknown> : {};
  const safeKeys = ["recipientId", "facilityId", "vendorId", "assignedVendorId", "assignedTechnicianId", "workOrderId", "serviceRequestId", "preventiveMaintenanceId", "planId", "occurrenceId", "entityId", "itemId", "applicationId"];
  const result: Record<string, string> = {};
  for (const key of safeKeys) if (typeof source[key] === "string") result[key] = source[key] as string;
  if (event.aggregateId) result.aggregateId = event.aggregateId;
  return result;
}
