import { AuthorizationException, BusinessException, ConflictException, NotFoundException } from "@/shared/errors/index.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { InventoryRepository } from "./inventory.repository.js";
import type { CreateItemInput, UpdateItemInput } from "./inventory.schema.js";
import type { ApplicationResult } from "@/shared/application-result/index.js";
import type { IInventoryItem } from "./inventory-item.model.js";
import type { IStockBalance } from "./stock-balance.model.js";
import { InventoryEventsService } from "./inventory-events.service.js";

export interface InventoryActor { userId: string; role: string; organizationId?: string }
const managerRoles = ["admin", "facility_manager"];
const stockRoles = ["admin", "facility_manager", "technician"];

export class InventoryService {
  private readonly events = new InventoryEventsService();
  constructor(private readonly repository = new InventoryRepository()) {}

  private organization(actor: InventoryActor): string {
    if (!actor.organizationId) throw new AuthorizationException("Organization context is required");
    return actor.organizationId;
  }
  private requireRole(actor: InventoryActor, roles: string[] = managerRoles): string {
    if (!roles.includes(actor.role)) throw new AuthorizationException("Inventory permission required");
    return this.organization(actor);
  }
  private itemResponse(item: IInventoryItem) { return { id: item._id.toString(), organizationId: item.organizationId.toString(), sku: item.sku, name: item.name, description: item.description, categoryId: item.categoryId?.toString(), unitOfMeasure: item.unitOfMeasure, status: item.status, minimumStockLevel: item.minimumStockLevel, reorderLevel: item.reorderLevel, maximumStockLevel: item.maximumStockLevel, preferredVendorId: item.preferredVendorId?.toString(), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() }; }
  private balanceResponse(balance: IStockBalance) { return { id: balance._id.toString(), itemId: balance.itemId.toString(), stockLocationId: balance.stockLocationId.toString(), quantity: balance.quantity, reservedQuantity: balance.reservedQuantity, availableQuantity: balance.quantity - balance.reservedQuantity, updatedAt: balance.updatedAt.toISOString() }; }
  private locationResponse(location: { _id: { toString(): string }; organizationId: { toString(): string }; name: string; code?: string; description?: string; facilityId?: { toString(): string }; status: string; createdAt: Date; updatedAt: Date }) { return { id: location._id.toString(), organizationId: location.organizationId.toString(), name: location.name, code: location.code, description: location.description, facilityId: location.facilityId?.toString(), status: location.status, createdAt: location.createdAt.toISOString(), updatedAt: location.updatedAt.toISOString() }; }
  private reservationResponse(reservation: { _id: { toString(): string }; organizationId: { toString(): string }; itemId: { toString(): string }; stockLocationId: { toString(): string }; quantity: number; consumedQuantity: number; workOrderId?: { toString(): string }; status: string; requestedBy: { toString(): string }; createdAt: Date; updatedAt: Date }) { return { id: reservation._id.toString(), organizationId: reservation.organizationId.toString(), itemId: reservation.itemId.toString(), stockLocationId: reservation.stockLocationId.toString(), quantity: reservation.quantity, consumedQuantity: reservation.consumedQuantity, remainingQuantity: reservation.quantity - reservation.consumedQuantity, workOrderId: reservation.workOrderId?.toString(), status: reservation.status, requestedBy: reservation.requestedBy.toString(), createdAt: reservation.createdAt.toISOString(), updatedAt: reservation.updatedAt.toISOString() }; }
  private transactionResponse(transaction: { _id: { toString(): string }; organizationId: { toString(): string }; itemId: { toString(): string }; stockLocationId: { toString(): string }; type: string; quantity: number; unitOfMeasure: string; workOrderId?: { toString(): string }; reservationId?: { toString(): string }; sourceLocationId?: { toString(): string }; destinationLocationId?: { toString(): string }; relatedTransactionId?: { toString(): string }; sourceTransactionId?: { toString(): string }; reference?: string; reason?: string; performedBy: { toString(): string }; createdAt: Date }) { return { id: transaction._id.toString(), organizationId: transaction.organizationId.toString(), itemId: transaction.itemId.toString(), stockLocationId: transaction.stockLocationId.toString(), type: transaction.type, quantity: transaction.quantity, unitOfMeasure: transaction.unitOfMeasure, workOrderId: transaction.workOrderId?.toString(), reservationId: transaction.reservationId?.toString(), sourceLocationId: transaction.sourceLocationId?.toString(), destinationLocationId: transaction.destinationLocationId?.toString(), relatedTransactionId: transaction.relatedTransactionId?.toString(), sourceTransactionId: transaction.sourceTransactionId?.toString(), reference: transaction.reference, reason: transaction.reason, performedBy: transaction.performedBy.toString(), createdAt: transaction.createdAt.toISOString() }; }

  async listItems(actor: InventoryActor, search?: string) { return (await this.repository.listItems(this.organization(actor), search)).map((item) => this.itemResponse(item)); }
  async createItem(data: CreateItemInput, actor: InventoryActor): Promise<ApplicationResult<unknown>> {
    const organizationId = this.requireRole(actor);
    if (data.categoryId && !(await this.repository.findCategory(data.categoryId, organizationId))) throw new NotFoundException("Inventory category not found");
    const item = await this.repository.createItem({ ...data, organizationId, createdBy: actor.userId });
    await this.events.auditEvent("inventory.item_created", actor.userId, organizationId, item._id.toString());
    return { success: true, message: "Inventory item created", data: this.itemResponse(item) };
  }
  async updateItem(id: string, data: UpdateItemInput, actor: InventoryActor): Promise<ApplicationResult<unknown>> {
    const organizationId = this.requireRole(actor);
    const item = await this.repository.updateItem(id, organizationId, { ...data, updatedBy: actor.userId });
    if (!item) throw new NotFoundException("Inventory item not found");
    await this.events.auditEvent("inventory.item_updated", actor.userId, organizationId, item._id.toString());
    return { success: true, message: "Inventory item updated", data: this.itemResponse(item) };
  }
  async deactivateItem(id: string, actor: InventoryActor): Promise<ApplicationResult<unknown>> {
    const organizationId = this.requireRole(actor);
    const item = await this.repository.updateItem(id, organizationId, { status: "inactive", updatedBy: actor.userId });
    if (!item) throw new NotFoundException("Inventory item not found");
    await this.events.auditEvent("inventory.item_deactivated", actor.userId, organizationId, item._id.toString());
    return { success: true, message: "Inventory item deactivated", data: this.itemResponse(item) };
  }
  async categories(actor: InventoryActor) { return this.repository.listCategories(this.organization(actor)); }
  async createCategory(name: string, description: string | undefined, actor: InventoryActor) { const organizationId = this.requireRole(actor); const category = await this.repository.createCategory({ organizationId, name, description, createdBy: actor.userId }); return { id: category._id.toString(), organizationId: category.organizationId.toString(), name: category.name, description: category.description, status: category.status, createdAt: category.createdAt.toISOString(), updatedAt: category.updatedAt.toISOString() }; }
  async locations(actor: InventoryActor) { return this.repository.listLocations(this.organization(actor)); }
  async createLocation(data: Record<string, unknown>, actor: InventoryActor) { const organizationId = this.requireRole(actor); const location = await this.repository.createLocation({ ...data, organizationId, createdBy: actor.userId }); await this.events.auditEvent("inventory.location_created", actor.userId, organizationId, location._id.toString()); return this.locationResponse(location); }
  async updateLocation(id: string, data: Record<string, unknown>, actor: InventoryActor) { const organizationId = this.requireRole(actor); const location = await this.repository.updateLocation(id, organizationId, { ...data, updatedBy: actor.userId }); if (!location) throw new NotFoundException("Stock location not found"); return this.locationResponse(location); }
  async deactivateLocation(id: string, actor: InventoryActor) { return this.updateLocation(id, { status: "inactive" }, actor); }

  private async context(itemId: string, stockLocationId: string, actor: InventoryActor) {
    const organizationId = this.organization(actor);
    const [item, location] = await Promise.all([this.repository.findItem(itemId, organizationId), this.repository.findLocation(stockLocationId, organizationId)]);
    if (!item) throw new NotFoundException("Inventory item not found");
    if (item.status !== "active") throw new BusinessException("Inventory item is inactive");
    if (!location || location.status !== "active") throw new NotFoundException("Stock location not found");
    return { organizationId, item, location };
  }
  async balances(actor: InventoryActor, itemId?: string, stockLocationId?: string) { return (await this.repository.findBalances(this.organization(actor), itemId, stockLocationId)).map((balance) => this.balanceResponse(balance)); }
  async receive(data: { itemId: string; stockLocationId: string; quantity: number; reference?: string; notes?: string; idempotencyKey?: string }, actor: InventoryActor) {
    const { organizationId, item } = await this.context(data.itemId, data.stockLocationId, actor);
    if (data.idempotencyKey) { const existing = await this.repository.findTransactionByIdempotencyKey(data.idempotencyKey, organizationId); if (existing) { const existingBalance = (await this.repository.findBalances(organizationId, data.itemId, data.stockLocationId))[0]; if (existingBalance) return this.balanceResponse(existingBalance); } }
    let result: Awaited<ReturnType<InventoryRepository["receiveAtomic"]>>;
    try {
      result = await this.repository.receiveAtomic({ organizationId, itemId: data.itemId, stockLocationId: data.stockLocationId, quantity: data.quantity, unitOfMeasure: item.unitOfMeasure, reference: data.reference, reason: data.notes, idempotencyKey: data.idempotencyKey, performedBy: actor.userId });
    } catch (error) {
      if (data.idempotencyKey && error instanceof Error && (error as Error & { code?: number }).code === 11000) {
        const existingBalance = (await this.repository.findBalances(organizationId, data.itemId, data.stockLocationId))[0];
        if (existingBalance) return this.balanceResponse(existingBalance);
      }
      throw error;
    }
    const { balance: updated, transaction } = result;
    await this.events.auditEvent("inventory.stock_received", actor.userId, organizationId, transaction._id.toString(), { itemId: data.itemId, quantity: data.quantity });
    return this.balanceResponse(updated!);
  }
  async reserve(data: { itemId: string; stockLocationId: string; quantity: number; workOrderId?: string; idempotencyKey?: string }, actor: InventoryActor) {
    if (!stockRoles.includes(actor.role)) throw new AuthorizationException("Inventory reservation permission required");
    const { organizationId, item } = await this.context(data.itemId, data.stockLocationId, actor);
    if (data.idempotencyKey) { const existing = await this.repository.findTransactionByIdempotencyKey(data.idempotencyKey, organizationId); if (existing?.reservationId) { const reservation = await this.repository.findReservation(existing.reservationId.toString(), organizationId); if (reservation) return this.reservationResponse(reservation); } }
    if (data.workOrderId && !(await WorkOrder.exists({ _id: data.workOrderId, organizationId }))) throw new NotFoundException("Work Order not found");
    let result: Awaited<ReturnType<InventoryRepository["reserveAtomic"]>>;
    try {
      result = await this.repository.reserveAtomic({ organizationId, itemId: data.itemId, stockLocationId: data.stockLocationId, quantity: data.quantity, unitOfMeasure: item.unitOfMeasure, workOrderId: data.workOrderId, idempotencyKey: data.idempotencyKey, requestedBy: actor.userId });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") throw new ConflictException("Insufficient available inventory");
      if (data.idempotencyKey && error instanceof Error && (error as Error & { code?: number }).code === 11000) {
        const existing = await this.repository.findTransactionByIdempotencyKey(data.idempotencyKey, organizationId);
        if (existing?.reservationId) {
          const reservation = await this.repository.findReservation(existing.reservationId.toString(), organizationId);
          if (reservation) return this.reservationResponse(reservation);
        }
      }
      throw error;
    }
    const { reservation, transaction } = result;
    await this.events.auditEvent("inventory.stock_reserved", actor.userId, organizationId, transaction._id.toString(), { itemId: data.itemId, quantity: data.quantity });
    return this.reservationResponse(reservation);
  }
  async release(reservationId: string, actor: InventoryActor) {
    const organizationId = this.organization(actor);
    try {
      const { balance: updated, transaction } = await this.repository.releaseAtomic({ organizationId, reservationId, performedBy: actor.userId });
      await this.events.auditEvent("inventory.reservation_released", actor.userId, organizationId, transaction._id.toString());
      return updated;
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_RESERVATION") throw new NotFoundException("Active reservation not found");
      if (error instanceof Error && error.message === "INCONSISTENT_RESERVATION_BALANCE") throw new ConflictException("Reservation balance is inconsistent");
      throw error;
    }
  }
  async issue(data: { itemId: string; stockLocationId: string; quantity: number; workOrderId?: string; reservationId?: string; sourceTransactionId?: string; reason?: string; idempotencyKey?: string }, actor: InventoryActor, type: "issue" | "consumption" = "issue") {
    if (!stockRoles.includes(actor.role)) throw new AuthorizationException("Inventory issue permission required");
    const { organizationId, item } = await this.context(data.itemId, data.stockLocationId, actor);
    if (data.idempotencyKey) { const existing = await this.repository.findTransactionByIdempotencyKey(data.idempotencyKey, organizationId); if (existing) { const existingBalance = (await this.repository.findBalances(organizationId, data.itemId, data.stockLocationId))[0]; if (existingBalance) return this.balanceResponse(existingBalance); } }
    if (data.workOrderId && !(await WorkOrder.exists({ _id: data.workOrderId, organizationId }))) throw new NotFoundException("Work Order not found");
    if (type === "consumption" && !data.reservationId && !data.sourceTransactionId) throw new BusinessException("Consumption must reference a reservation or issue transaction");
    if (type === "consumption" && data.sourceTransactionId) {
      try {
        const { balance: updated, transaction } = await this.repository.consumeSourceAtomic({ organizationId, sourceTransactionId: data.sourceTransactionId, itemId: data.itemId, stockLocationId: data.stockLocationId, quantity: data.quantity, unitOfMeasure: item.unitOfMeasure, workOrderId: data.workOrderId, reason: data.reason, idempotencyKey: data.idempotencyKey, performedBy: actor.userId });
        await this.events.auditEvent("inventory.stock_consumed", actor.userId, organizationId, transaction._id.toString());
        return this.balanceResponse(updated);
      } catch (error) {
        if (error instanceof Error && error.message === "SOURCE_TRANSACTION_NOT_FOUND") throw new NotFoundException("Issue transaction not found");
        if (error instanceof Error && ["CONSUMPTION_EXCEEDS_SOURCE", "INSUFFICIENT_STOCK"].includes(error.message)) throw new ConflictException(error.message === "CONSUMPTION_EXCEEDS_SOURCE" ? "Consumption exceeds issued quantity" : "Insufficient available inventory");
        if (data.idempotencyKey && error instanceof Error && (error as Error & { code?: number }).code === 11000) {
          const existing = await this.repository.findTransactionByIdempotencyKey(data.idempotencyKey, organizationId);
          if (existing) { const existingBalance = (await this.repository.findBalances(organizationId, data.itemId, data.stockLocationId))[0]; if (existingBalance) return this.balanceResponse(existingBalance); }
        }
        throw error;
      }
    }
    let result: Awaited<ReturnType<InventoryRepository["issueAtomic"]>>;
    try {
      result = await this.repository.issueAtomic({ organizationId, itemId: data.itemId, stockLocationId: data.stockLocationId, quantity: data.quantity, unitOfMeasure: item.unitOfMeasure, workOrderId: data.workOrderId, reservationId: data.reservationId, reason: data.reason, idempotencyKey: data.idempotencyKey, performedBy: actor.userId, type });
    } catch (error) {
      if (error instanceof Error && ["INSUFFICIENT_STOCK", "INVALID_RESERVATION"].includes(error.message)) throw new ConflictException(error.message === "INSUFFICIENT_STOCK" ? "Insufficient available inventory" : "Reservation is invalid or already completed");
      if (data.idempotencyKey && error instanceof Error && (error as Error & { code?: number }).code === 11000) {
        const existing = await this.repository.findTransactionByIdempotencyKey(data.idempotencyKey, organizationId);
        if (existing) { const existingBalance = (await this.repository.findBalances(organizationId, data.itemId, data.stockLocationId))[0]; if (existingBalance) return this.balanceResponse(existingBalance); }
      }
      throw error;
    }
    const { balance: updated, transaction } = result;
    await this.events.auditEvent(type === "consumption" ? "inventory.stock_consumed" : "inventory.stock_issued", actor.userId, organizationId, transaction._id.toString(), { itemId: data.itemId, quantity: data.quantity }); const response = this.balanceResponse(updated); if (response.availableQuantity <= item.reorderLevel) await this.events.lowStock(organizationId, actor.userId, item._id.toString(), item.name, response.availableQuantity); return response;
  }
  async adjust(data: { itemId: string; stockLocationId: string; quantity: number; reason: string }, actor: InventoryActor) {
    const { organizationId, item } = await this.context(data.itemId, data.stockLocationId, actor);
    try {
      const { balance: updated, transaction } = await this.repository.adjustAtomic({ organizationId, itemId: data.itemId, stockLocationId: data.stockLocationId, quantity: data.quantity, unitOfMeasure: item.unitOfMeasure, reason: data.reason, performedBy: actor.userId });
      await this.events.auditEvent("inventory.stock_adjusted", actor.userId, organizationId, transaction._id.toString());
      return this.balanceResponse(updated);
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") throw new ConflictException("Adjustment would create negative available stock");
      throw error;
    }
  }
  async transfer(data: { itemId: string; sourceLocationId: string; destinationLocationId: string; quantity: number; reference?: string; notes?: string }, actor: InventoryActor) {
    const organizationId = this.requireRole(actor, stockRoles);
    if (data.sourceLocationId === data.destinationLocationId) throw new BusinessException("Transfer locations must differ");
    const { item } = await this.context(data.itemId, data.sourceLocationId, actor);
    await this.context(data.itemId, data.destinationLocationId, actor);
    const transaction = await this.repository.transferAtomic({ organizationId, itemId: data.itemId, sourceLocationId: data.sourceLocationId, destinationLocationId: data.destinationLocationId, quantity: data.quantity, unitOfMeasure: item.unitOfMeasure, reference: data.reference, reason: data.notes, performedBy: actor.userId });
    if (!transaction) throw new ConflictException("Transfer could not be completed");
    await this.events.auditEvent("inventory.stock_transferred", actor.userId, organizationId, transaction._id.toString(), { sourceLocationId: data.sourceLocationId, destinationLocationId: data.destinationLocationId }); return transaction;
  }
  async returnStock(data: { originalTransactionId: string; quantity: number; reason?: string }, actor: InventoryActor) {
    const organizationId = this.organization(actor);
    try {
      const { balance: updated, transaction } = await this.repository.returnAtomic({ organizationId, originalTransactionId: data.originalTransactionId, quantity: data.quantity, reason: data.reason, performedBy: actor.userId });
      await this.events.auditEvent("inventory.stock_returned", actor.userId, organizationId, transaction._id.toString(), { originalTransactionId: data.originalTransactionId });
      return this.balanceResponse(updated);
    } catch (error) {
      if (error instanceof Error && error.message === "SOURCE_TRANSACTION_NOT_FOUND") throw new NotFoundException("Issue transaction not found");
      if (error instanceof Error && error.message === "RETURN_EXCEEDS_SOURCE") throw new ConflictException("Return exceeds issued quantity");
      throw error;
    }
  }
  async overview(actor: InventoryActor) {
    const organizationId = this.organization(actor);
    const [items, balances, categories] = await Promise.all([
      this.repository.listItems(organizationId),
      this.repository.findBalances(organizationId),
      this.repository.listCategories(organizationId),
    ]);

    const totalItems = items.length;
    const reservedItems = balances.reduce((sum, b) => sum + b.reservedQuantity, 0);

    const itemMap = new Map(items.map((i) => [i._id.toString(), i]));
    let lowStockItemsCount = 0;
    const lowStockAlerts: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      onHand: number;
      minimumLevel: number;
      stockLocation: string;
    }> = [];

    for (const b of balances) {
      const item = itemMap.get(b.itemId.toString());
      if (item && b.quantity <= item.minimumStockLevel) {
        lowStockItemsCount++;
        if (lowStockAlerts.length < 10) {
          lowStockAlerts.push({
            id: item._id.toString(),
            name: item.name,
            sku: item.sku,
            category: item.categoryId?.toString() ?? 'General',
            onHand: b.quantity,
            minimumLevel: item.minimumStockLevel,
            stockLocation: b.stockLocationId.toString(),
          });
        }
      }
    }

    return {
      totalItems,
      lowStockItems: lowStockItemsCount,
      reservedItems,
      pendingTransfers: 0,
      categoriesCount: categories.length,
      lowStockAlerts,
      stockByCategory: categories.slice(0, 5).map((c) => ({
        category: c.name,
        itemCount: items.filter((i) => i.categoryId?.toString() === c._id.toString()).length,
        percentage: 50,
        color: 'primary',
      })),
    };
  }
  async reconcile(actor: InventoryActor) {
    return { organizationId: this.organization(actor), discrepancies: (await this.repository.reconcile(this.organization(actor))).filter((entry) => !entry.consistent) };
  }
  async history(actor: InventoryActor, itemId?: string, stockLocationId?: string, workOrderId?: string) { return (await this.repository.findTransactions(this.organization(actor), { ...(itemId ? { itemId } : {}), ...(stockLocationId ? { stockLocationId } : {}), ...(workOrderId ? { workOrderId } : {}) })).map((transaction) => this.transactionResponse(transaction)); }
}
