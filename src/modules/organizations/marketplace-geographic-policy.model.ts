import { Schema, model, type Document, type Types } from "mongoose";
export type MarketplacePriority = "low" | "medium" | "high" | "critical";
export interface IMarketplaceGeographicPolicy extends Document { organizationId: Types.ObjectId; priority: MarketplacePriority; maxDistanceKm: number; enabled: boolean; createdBy: Types.ObjectId; updatedBy?: Types.ObjectId; createdAt: Date; updatedAt: Date }
const schema = new Schema<IMarketplaceGeographicPolicy>({ organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true }, priority: { type: String, enum: ["low", "medium", "high", "critical"], required: true }, maxDistanceKm: { type: Number, min: 0, required: true }, enabled: { type: Boolean, default: true }, createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, updatedBy: { type: Schema.Types.ObjectId, ref: "User" } }, { timestamps: true });
schema.index({ organizationId: 1, priority: 1 }, { unique: true, partialFilterExpression: { enabled: true } });
export const MarketplaceGeographicPolicy = model<IMarketplaceGeographicPolicy>("MarketplaceGeographicPolicy", schema);
