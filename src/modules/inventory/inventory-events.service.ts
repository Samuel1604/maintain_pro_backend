import { eventPublisher } from "@/container/index.js";
import { BusinessFactEvent } from "@/infrastructure/events/business-fact.event.js";
import type { AuditAction } from "@/modules/audit/audit.types.js";

export class InventoryEventsService {
  async auditEvent(action: AuditAction, actorId: string, organizationId: string, entityId: string, metadata?: Record<string, unknown>) {
    // Keep inventory event names aligned with the cross-cutting subscriber catalog.
    const eventName = ({ item_created: "ItemCreated", item_updated: "ItemUpdated", item_deactivated: "ItemDeactivated", location_created: "LocationCreated", stock_received: "StockReceived", stock_reserved: "StockReserved", reservation_released: "ReservationReleased", stock_issued: "StockIssued", stock_consumed: "StockConsumed", stock_returned: "StockReturned", stock_adjusted: "StockAdjusted", stock_transferred: "StockTransferred" } as Record<string, string>)[action.replace("inventory.", "")] ?? action;
    await eventPublisher.publish(new BusinessFactEvent(eventName, { ...metadata, entityId, action }, { organizationId, actorId, aggregateType: "inventory", aggregateId: entityId }));
  }

  async lowStock(organizationId: string, actorId: string, itemId: string, itemName: string, availableQuantity: number) {
    await eventPublisher.publish(new BusinessFactEvent("LowStockDetected", { itemId, itemName, availableQuantity }, { organizationId, actorId, aggregateType: "inventory", aggregateId: itemId }));
  }
}
