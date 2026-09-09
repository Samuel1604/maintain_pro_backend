import { Schema, model, type Document, type Types } from "mongoose";

export type OutboxEventStatus = "pending" | "processing" | "published" | "dead_letter";

export interface OutboxEventDocument extends Document {
  eventId: string;
  eventType: string;
  aggregateId?: Types.ObjectId | string;
  aggregateType?: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  attempts: number;
  availableAt: Date;
  createdAt: Date;
  processedAt?: Date;
  lastError?: string;
  leaseUntil?: Date;
}

const schema = new Schema<OutboxEventDocument>({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true, index: true },
  aggregateId: Schema.Types.Mixed,
  aggregateType: String,
  payload: { type: Schema.Types.Mixed, required: true },
  status: { type: String, enum: ["pending", "processing", "published", "dead_letter"], required: true, default: "pending", index: true },
  attempts: { type: Number, required: true, default: 0 },
  availableAt: { type: Date, required: true, default: Date.now, index: true },
  processedAt: Date,
  lastError: String,
  leaseUntil: Date,
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ status: 1, availableAt: 1 });
schema.index({ status: 1, leaseUntil: 1 });
schema.index({ eventType: 1, createdAt: -1 });

export const OutboxEvent = model<OutboxEventDocument>("OutboxEvent", schema);
