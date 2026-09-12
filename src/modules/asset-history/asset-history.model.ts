import { Schema, model, type Document, type Types } from "mongoose";
import {
  ASSET_HISTORY_EVENTS,
  type AssetHistoryEvent,
} from "./asset-history.types.js";
export interface IAssetHistoryEntry extends Document {
  organizationId: Types.ObjectId;
  assetId: Types.ObjectId;
  event: AssetHistoryEvent;
  description?: string;
  actorId?: Types.ObjectId;
  sourceType?: string;
  sourceId?: Types.ObjectId;
  data?: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IAssetHistoryEntry>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
      index: true,
    },
    event: {
      type: String,
      enum: Object.values(ASSET_HISTORY_EVENTS),
      required: true,
      index: true,
    },
    description: String,
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    sourceType: String,
    sourceId: Schema.Types.ObjectId,
    data: Schema.Types.Mixed,
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true },
);
schema.index({ organizationId: 1, assetId: 1, occurredAt: -1 });
export const AssetHistoryEntry = model<IAssetHistoryEntry>(
  "AssetHistoryEntry",
  schema,
);
