import { Schema, model } from "mongoose";

export type ProcessedEventStatus = "processing" | "completed" | "failed";

export interface ProcessedEventDocument {
  eventId: string;
  consumerName: string;
  jobId?: string;
  queue?: string;
  eventName: string;
  correlationId?: string;
  causationId?: string;
  status: ProcessedEventStatus;
  attempts: number;
  startedAt?: Date;
  completedAt?: Date;
  lastError?: string;
  leaseUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ProcessedEventDocument>({
  eventId: { type: String, required: true, index: true },
  consumerName: { type: String, required: true, index: true },
  jobId: String, queue: String, eventName: { type: String, required: true, index: true },
  correlationId: String, causationId: String,
  status: { type: String, enum: ["processing", "completed", "failed"], required: true, index: true },
  attempts: { type: Number, default: 0 }, startedAt: Date, completedAt: Date, lastError: String, leaseUntil: Date,
}, { timestamps: true });

schema.index({ eventId: 1, consumerName: 1 }, { unique: true });

export const ProcessedEvent = model<ProcessedEventDocument>("ProcessedEvent", schema);
