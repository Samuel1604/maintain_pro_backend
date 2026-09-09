import { Schema, model, Document, Types } from "mongoose";

export interface IStockBalance extends Document {
  organizationId: Types.ObjectId;
  itemId: Types.ObjectId;
  stockLocationId: Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IStockBalance>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  itemId: { type: Schema.Types.ObjectId, ref: "InventoryItem", required: true, index: true },
  stockLocationId: { type: Schema.Types.ObjectId, ref: "StockLocation", required: true, index: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  reservedQuantity: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

schema.index({ organizationId: 1, itemId: 1, stockLocationId: 1 }, { unique: true });
export const StockBalance = model<IStockBalance>("StockBalance", schema);
