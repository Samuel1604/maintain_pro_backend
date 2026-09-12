import { Schema, model, Document, Types } from "mongoose";

export interface QuotationLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface IQuotationRevision extends Document {
  quotationId: Types.ObjectId;
  revision: number;
  organizationId: Types.ObjectId;
  vendorApplicationId: Types.ObjectId;
  vendorId: Types.ObjectId;
  currency: string;
  lineItems: QuotationLineItem[];
  subtotalMinor: number;
  taxAndFeesMinor: number;
  totalMinor: number;
  validUntil?: Date;
  terms?: string;
  notes?: string;
  revisionReason?: string;
  submittedBy: Types.ObjectId;
  submittedAt: Date;
  createdAt: Date;
}

const lineItemSchema = new Schema<QuotationLineItem>({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true },
  unitPriceMinor: { type: Number, required: true, min: 0 },
  lineTotalMinor: { type: Number, required: true, min: 0 },
}, { _id: false });

const schema = new Schema<IQuotationRevision>({
  quotationId: { type: Schema.Types.ObjectId, ref: "Quotation", required: true, index: true },
  revision: { type: Number, required: true, min: 1 },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  vendorApplicationId: { type: Schema.Types.ObjectId, ref: "VendorApplication", required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
  currency: { type: String, required: true, uppercase: true },
  lineItems: { type: [lineItemSchema], required: true },
  subtotalMinor: { type: Number, required: true, min: 0 },
  taxAndFeesMinor: { type: Number, required: true, min: 0 },
  totalMinor: { type: Number, required: true, min: 0 },
  validUntil: Date,
  terms: String,
  notes: String,
  revisionReason: String,
  submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ quotationId: 1, revision: 1 }, { unique: true });

export const QuotationRevision = model<IQuotationRevision>("QuotationRevision", schema);
