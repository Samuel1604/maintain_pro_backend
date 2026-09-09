import { InventoryItem } from "./inventory-item.model.js";
import { InventoryCategory } from "./inventory-category.model.js";
import { StockLocation } from "./stock-location.model.js";
import { StockBalance } from "./stock-balance.model.js";
import { InventoryTransaction } from "./inventory-transaction.model.js";
import { InventoryReservation } from "./inventory-reservation.model.js";
import mongoose from "mongoose";
import type { IInventoryTransaction } from "./inventory-transaction.model.js";
import type { IStockBalance } from "./stock-balance.model.js";
import type { ClientSession } from "mongoose";

export class InventoryRepository {
  listItems(organizationId: string, search?: string) {
    const filter = { organizationId, ...(search ? { $or: [{ name: { $regex: search, $options: "i" } }, { sku: { $regex: search, $options: "i" } }] } : {}) };
    return InventoryItem.find(filter).sort({ name: 1 });
  }
  findItem(id: string, organizationId: string) { return InventoryItem.findOne({ _id: id, organizationId }); }
  createItem(data: Record<string, unknown>) { return InventoryItem.create(data); }
  updateItem(id: string, organizationId: string, data: Record<string, unknown>) { return InventoryItem.findOneAndUpdate({ _id: id, organizationId }, data, { new: true }); }
  listCategories(organizationId: string) { return InventoryCategory.find({ organizationId, status: "active" }).sort({ name: 1 }); }
  createCategory(data: Record<string, unknown>) { return InventoryCategory.create(data); }
  findCategory(id: string, organizationId: string) { return InventoryCategory.findOne({ _id: id, organizationId }); }
  listLocations(organizationId: string) { return StockLocation.find({ organizationId }).sort({ name: 1 }); }
  findLocation(id: string, organizationId: string) { return StockLocation.findOne({ _id: id, organizationId }); }
  createLocation(data: Record<string, unknown>) { return StockLocation.create(data); }
  updateLocation(id: string, organizationId: string, data: Record<string, unknown>) { return StockLocation.findOneAndUpdate({ _id: id, organizationId }, data, { new: true }); }
  ensureBalance(organizationId: string, itemId: string, stockLocationId: string, session?: ClientSession) { return StockBalance.findOneAndUpdate({ organizationId, itemId, stockLocationId }, { $setOnInsert: { quantity: 0, reservedQuantity: 0 } }, { upsert: true, new: true, ...(session ? { session } : {}) }); }
  findBalances(organizationId: string, itemId?: string, stockLocationId?: string) { return StockBalance.find({ organizationId, ...(itemId ? { itemId } : {}), ...(stockLocationId ? { stockLocationId } : {}) }); }

  async reconcile(organizationId: string) {
    const ledger = await InventoryTransaction.aggregate<{ _id: { itemId: unknown; stockLocationId: unknown }; quantity: number }>([
      { $match: { organizationId: new mongoose.Types.ObjectId(organizationId) } },
      { $project: {
        itemId: 1,
        deltas: {
          $concatArrays: [
            [{
              locationId: "$stockLocationId",
              quantity: {
                $switch: {
                  branches: [
                    { case: { $in: ["$type", ["issue", "consumption"]] }, then: { $multiply: ["$quantity", -1] } },
                    { case: { $eq: ["$type", "adjustment"] }, then: "$quantity" },
                    { case: { $in: ["$type", ["receipt", "return"]] }, then: "$quantity" },
                  ],
                  default: 0,
                },
              },
            }],
            { $cond: [{ $eq: ["$type", "transfer"] }, [{ locationId: "$destinationLocationId", quantity: "$quantity" }], []] },
          ],
        },
      } },
      { $unwind: "$deltas" },
      { $group: { _id: { itemId: "$itemId", stockLocationId: "$deltas.locationId" }, quantity: { $sum: "$deltas.quantity" } } },
    ]);
    const reservations = await InventoryReservation.aggregate<{ _id: { itemId: unknown; stockLocationId: unknown }; reservedQuantity: number }>([
      { $match: { organizationId: new mongoose.Types.ObjectId(organizationId), status: "reserved" } },
      { $group: { _id: { itemId: "$itemId", stockLocationId: "$stockLocationId" }, reservedQuantity: { $sum: { $subtract: ["$quantity", "$consumedQuantity"] } } } },
    ]);
    const balances = await StockBalance.find({ organizationId }).lean();
    const expected = new Map(ledger.map((entry) => [`${String(entry._id.itemId)}:${String(entry._id.stockLocationId)}`, entry.quantity]));
    const expectedReserved = new Map(reservations.map((entry) => [`${String(entry._id.itemId)}:${String(entry._id.stockLocationId)}`, entry.reservedQuantity]));
    return balances.map((balance) => {
      const key = `${balance.itemId.toString()}:${balance.stockLocationId.toString()}`;
      const expectedQuantity = expected.get(key) ?? 0;
      const expectedReservedQuantity = expectedReserved.get(key) ?? 0;
      return { itemId: balance.itemId.toString(), stockLocationId: balance.stockLocationId.toString(), recordedQuantity: balance.quantity, expectedQuantity, quantityDelta: balance.quantity - expectedQuantity, recordedReservedQuantity: balance.reservedQuantity, expectedReservedQuantity, reservedQuantityDelta: balance.reservedQuantity - expectedReservedQuantity, consistent: balance.quantity === expectedQuantity && balance.reservedQuantity === expectedReservedQuantity };
    });
  }
  increaseBalance(id: string, quantity: number, session?: ClientSession) { return StockBalance.findOneAndUpdate({ _id: id }, { $inc: { quantity } }, { new: true, ...(session ? { session } : {}) }); }
  decreaseAvailable(id: string, quantity: number, session?: ClientSession) { return StockBalance.findOneAndUpdate({ _id: id, $expr: { $gte: [{ $subtract: ["$quantity", "$reservedQuantity"] }, quantity] } }, { $inc: { quantity: -quantity } }, { new: true, ...(session ? { session } : {}) }); }
  reserveBalance(id: string, quantity: number, session?: ClientSession) { return StockBalance.findOneAndUpdate({ _id: id, $expr: { $gte: [{ $subtract: ["$quantity", "$reservedQuantity"] }, quantity] } }, { $inc: { reservedQuantity: quantity } }, { new: true, ...(session ? { session } : {}) }); }
  releaseBalance(id: string, quantity: number, session?: ClientSession) { return StockBalance.findOneAndUpdate({ _id: id, reservedQuantity: { $gte: quantity } }, { $inc: { reservedQuantity: -quantity } }, { new: true, ...(session ? { session } : {}) }); }
  consumeReserved(id: string, quantity: number, session?: ClientSession) { return StockBalance.findOneAndUpdate({ _id: id, quantity: { $gte: quantity }, reservedQuantity: { $gte: quantity } }, { $inc: { quantity: -quantity, reservedQuantity: -quantity } }, { new: true, ...(session ? { session } : {}) }); }
  createTransaction(data: Record<string, unknown>, session?: ClientSession) { return session ? InventoryTransaction.create([data], { session }).then(([transaction]) => transaction!) : InventoryTransaction.create(data); }

  async receiveAtomic(data: { organizationId: string; itemId: string; stockLocationId: string; quantity: number; unitOfMeasure: string; reference?: string; reason?: string; idempotencyKey?: string; performedBy: string }) {
    const session = await mongoose.startSession();
    try {
      let result: { balance: NonNullable<Awaited<ReturnType<InventoryRepository["ensureBalance"]>>>; transaction: IInventoryTransaction } | undefined;
      await session.withTransaction(async () => {
        const balance = await this.ensureBalance(data.organizationId, data.itemId, data.stockLocationId, session);
        const updated = await this.increaseBalance(balance._id.toString(), data.quantity, session);
        if (!updated) throw new Error("RECEIPT_BALANCE_UPDATE_FAILED");
        const transaction = await this.createTransaction({ ...data, type: "receipt" }, session);
        result = { balance: updated, transaction };
      });
      if (!result) throw new Error("RECEIPT_TRANSACTION_FAILED");
      return result;
    } finally {
      await session.endSession();
    }
  }

  async reserveAtomic(data: { organizationId: string; itemId: string; stockLocationId: string; quantity: number; unitOfMeasure: string; workOrderId?: string; idempotencyKey?: string; requestedBy: string }) {
    const session = await mongoose.startSession();
    try {
      let result: { reservation: NonNullable<Awaited<ReturnType<InventoryRepository["createReservation"]>>>; transaction: IInventoryTransaction } | undefined;
      await session.withTransaction(async () => {
        const balance = await this.ensureBalance(data.organizationId, data.itemId, data.stockLocationId, session);
        const updated = await this.reserveBalance(balance._id.toString(), data.quantity, session);
        if (!updated) throw new Error("INSUFFICIENT_STOCK");
        const reservation = await this.createReservation({ organizationId: data.organizationId, itemId: data.itemId, stockLocationId: data.stockLocationId, quantity: data.quantity, workOrderId: data.workOrderId, status: "reserved", requestedBy: data.requestedBy }, session);
        const transaction = await this.createTransaction({ ...data, type: "reservation", reservationId: reservation._id }, session);
        result = { reservation, transaction };
      });
      if (!result) throw new Error("RESERVATION_TRANSACTION_FAILED");
      return result;
    } finally {
      await session.endSession();
    }
  }
  findTransactions(organizationId: string, filter: Record<string, unknown>) { return InventoryTransaction.find({ organizationId, ...filter }).sort({ createdAt: -1 }); }
  findTransaction(id: string, organizationId: string) { return InventoryTransaction.findOne({ _id: id, organizationId }); }
  findTransactionByIdempotencyKey(idempotencyKey: string, organizationId: string) { return InventoryTransaction.findOne({ idempotencyKey, organizationId }); }
  findTransactionsBySource(sourceTransactionId: string, organizationId: string, type?: string, session?: ClientSession) { return InventoryTransaction.find({ sourceTransactionId, organizationId, ...(type ? { type: type as IInventoryTransaction["type"] } : {}) } as Record<string, unknown>, undefined, session ? { session } : undefined); }
  findReturns(transactionId: string, organizationId: string, session?: ClientSession) { return InventoryTransaction.find({ relatedTransactionId: transactionId, organizationId, type: "return" }, undefined, session ? { session } : undefined); }
  createReservation(data: Record<string, unknown>, session?: ClientSession) { return session ? InventoryReservation.create([data], { session }).then(([reservation]) => reservation!) : InventoryReservation.create(data); }
  findReservation(id: string, organizationId: string, session?: ClientSession) { return InventoryReservation.findOne({ _id: id, organizationId }, undefined, session ? { session } : undefined); }
  updateReservation(id: string, organizationId: string, data: Record<string, unknown>, session?: ClientSession) { return InventoryReservation.findOneAndUpdate({ _id: id, organizationId }, data, { new: true, ...(session ? { session } : {}) }); }

  async issueAtomic(data: { organizationId: string; itemId: string; stockLocationId: string; quantity: number; unitOfMeasure: string; workOrderId?: string; reservationId?: string; reason?: string; idempotencyKey?: string; performedBy: string; type: "issue" | "consumption" }) {
    const session = await mongoose.startSession();
    try {
      let result: { balance: NonNullable<Awaited<ReturnType<InventoryRepository["ensureBalance"]>>>; transaction: IInventoryTransaction } | undefined;
      await session.withTransaction(async () => {
        const balance = await this.ensureBalance(data.organizationId, data.itemId, data.stockLocationId, session);
        let updated;
        if (data.reservationId) {
          const reservation = await this.findReservation(data.reservationId, data.organizationId, session);
          if (!reservation || reservation.status !== "reserved" || reservation.itemId.toString() !== data.itemId || reservation.stockLocationId.toString() !== data.stockLocationId || data.quantity > reservation.quantity - reservation.consumedQuantity) throw new Error("INVALID_RESERVATION");
          updated = await this.consumeReserved(balance._id.toString(), data.quantity, session);
          if (!updated) throw new Error("INSUFFICIENT_STOCK");
          const consumedQuantity = reservation.consumedQuantity + data.quantity;
          await this.updateReservation(data.reservationId, data.organizationId, { consumedQuantity, status: consumedQuantity === reservation.quantity ? "consumed" : "reserved" }, session);
        } else {
          updated = await this.decreaseAvailable(balance._id.toString(), data.quantity, session);
          if (!updated) throw new Error("INSUFFICIENT_STOCK");
        }
        const transaction = await this.createTransaction(data, session);
        result = { balance: updated, transaction };
      });
      if (!result) throw new Error("ISSUE_TRANSACTION_FAILED");
      return result;
    } finally {
      await session.endSession();
    }
  }

  async releaseAtomic(data: { organizationId: string; reservationId: string; performedBy: string }) {
    const session = await mongoose.startSession();
    try {
      let result: { balance: IStockBalance; transaction: IInventoryTransaction } | undefined;
      await session.withTransaction(async () => {
        const reservation = await this.findReservation(data.reservationId, data.organizationId, session);
        if (!reservation || reservation.status !== "reserved") throw new Error("INVALID_RESERVATION");
        const balance = await this.ensureBalance(data.organizationId, reservation.itemId.toString(), reservation.stockLocationId.toString(), session);
        const updated = await this.releaseBalance(balance._id.toString(), reservation.quantity - reservation.consumedQuantity, session);
        if (!updated) throw new Error("INCONSISTENT_RESERVATION_BALANCE");
        await this.updateReservation(data.reservationId, data.organizationId, { status: "released" }, session);
        const transaction = await this.createTransaction({ organizationId: data.organizationId, itemId: reservation.itemId, stockLocationId: reservation.stockLocationId, type: "release", quantity: reservation.quantity - reservation.consumedQuantity, unitOfMeasure: "", reservationId: reservation._id, workOrderId: reservation.workOrderId, performedBy: data.performedBy }, session);
        result = { balance: updated, transaction };
      });
      if (!result) throw new Error("RELEASE_TRANSACTION_FAILED");
      return result;
    } finally {
      await session.endSession();
    }
  }

  async adjustAtomic(data: { organizationId: string; itemId: string; stockLocationId: string; quantity: number; unitOfMeasure: string; reason: string; performedBy: string }) {
    const session = await mongoose.startSession();
    try {
      let result: { balance: IStockBalance; transaction: IInventoryTransaction } | undefined;
      await session.withTransaction(async () => {
        const balance = await this.ensureBalance(data.organizationId, data.itemId, data.stockLocationId, session);
        const updated = data.quantity > 0
          ? await this.increaseBalance(balance._id.toString(), data.quantity, session)
          : await this.decreaseAvailable(balance._id.toString(), Math.abs(data.quantity), session);
        if (!updated) throw new Error("INSUFFICIENT_STOCK");
        const transaction = await this.createTransaction({ ...data, type: "adjustment" }, session);
        result = { balance: updated, transaction };
      });
      if (!result) throw new Error("ADJUSTMENT_TRANSACTION_FAILED");
      return result;
    } finally {
      await session.endSession();
    }
  }

  async consumeSourceAtomic(data: { organizationId: string; sourceTransactionId: string; itemId: string; stockLocationId: string; quantity: number; unitOfMeasure: string; workOrderId?: string; reason?: string; idempotencyKey?: string; performedBy: string }) {
    const session = await mongoose.startSession();
    try {
      let result: { balance: IStockBalance; transaction: IInventoryTransaction } | undefined;
      await session.withTransaction(async () => {
        const source = await InventoryTransaction.findOne({ _id: data.sourceTransactionId, organizationId: data.organizationId }, undefined, { session });
        if (!source || source.type !== "issue" || source.itemId.toString() !== data.itemId || source.stockLocationId.toString() !== data.stockLocationId) throw new Error("SOURCE_TRANSACTION_NOT_FOUND");
        const consumed = await this.findTransactionsBySource(data.sourceTransactionId, data.organizationId, "consumption", session);
        if (consumed.reduce((sum, entry) => sum + entry.quantity, 0) + data.quantity > source.quantity) throw new Error("CONSUMPTION_EXCEEDS_SOURCE");
        const balance = await this.ensureBalance(data.organizationId, data.itemId, data.stockLocationId, session);
        const updated = await this.decreaseAvailable(balance._id.toString(), data.quantity, session);
        if (!updated) throw new Error("INSUFFICIENT_STOCK");
        const transaction = await this.createTransaction({ ...data, type: "consumption", sourceTransactionId: source._id }, session);
        result = { balance: updated, transaction };
      });
      if (!result) throw new Error("CONSUMPTION_TRANSACTION_FAILED");
      return result;
    } finally {
      await session.endSession();
    }
  }

  async returnAtomic(data: { organizationId: string; originalTransactionId: string; quantity: number; reason?: string; performedBy: string }) {
    const session = await mongoose.startSession();
    try {
      let result: { balance: IStockBalance; transaction: IInventoryTransaction } | undefined;
      await session.withTransaction(async () => {
        const original = await InventoryTransaction.findOne({ _id: data.originalTransactionId, organizationId: data.organizationId }, undefined, { session });
        if (!original || !["issue", "consumption"].includes(original.type)) throw new Error("SOURCE_TRANSACTION_NOT_FOUND");
        const returned = await this.findReturns(data.originalTransactionId, data.organizationId, session);
        if (returned.reduce((sum, entry) => sum + entry.quantity, 0) + data.quantity > original.quantity) throw new Error("RETURN_EXCEEDS_SOURCE");
        const balance = await this.ensureBalance(data.organizationId, original.itemId.toString(), original.stockLocationId.toString(), session);
        const updated = await this.increaseBalance(balance._id.toString(), data.quantity, session);
        if (!updated) throw new Error("RETURN_BALANCE_UPDATE_FAILED");
        const transaction = await this.createTransaction({ organizationId: data.organizationId, itemId: original.itemId, stockLocationId: original.stockLocationId, type: "return", quantity: data.quantity, unitOfMeasure: original.unitOfMeasure, workOrderId: original.workOrderId, relatedTransactionId: original._id, reason: data.reason, performedBy: data.performedBy }, session);
        result = { balance: updated, transaction };
      });
      if (!result) throw new Error("RETURN_TRANSACTION_FAILED");
      return result;
    } finally {
      await session.endSession();
    }
  }
  async transferAtomic(data: { organizationId: string; itemId: string; sourceLocationId: string; destinationLocationId: string; quantity: number; unitOfMeasure: string; reference?: string; reason?: string; performedBy: string }) {
    const session = await mongoose.startSession();
    try {
      let transaction: IInventoryTransaction | undefined;
      await session.withTransaction(async () => {
        const source = await StockBalance.findOneAndUpdate({ organizationId: data.organizationId, itemId: data.itemId, stockLocationId: data.sourceLocationId, $expr: { $gte: [{ $subtract: ["$quantity", "$reservedQuantity"] }, data.quantity] } }, { $inc: { quantity: -data.quantity } }, { new: true, session });
        if (!source) throw new Error("INSUFFICIENT_STOCK");
        const destination = await StockBalance.findOneAndUpdate({ organizationId: data.organizationId, itemId: data.itemId, stockLocationId: data.destinationLocationId }, { $inc: { quantity: data.quantity } }, { new: true, session, upsert: true });
        if (!destination) throw new Error("TRANSFER_DESTINATION_FAILED");
        const created = await InventoryTransaction.create([{ ...data, stockLocationId: data.sourceLocationId, sourceLocationId: data.sourceLocationId, destinationLocationId: data.destinationLocationId, type: "transfer" }], { session });
        transaction = created[0];
      });
      return transaction;
    } finally {
      await session.endSession();
    }
  }
}
