import { Schema, model, Document, Types } from "mongoose";

export type InvoiceStatus = "submitted" | "under_review" | "approved" | "rejected" | "paid" | "disputed";
export interface IInvoice extends Document {
  organizationId: Types.ObjectId; vendorId: Types.ObjectId; workOrderId?: Types.ObjectId; contractId?: Types.ObjectId;
  invoiceNumber: string; amount: number; currency: string; status: InvoiceStatus; submittedAt: Date; dueDate?: Date;
  notes?: string; rejectionReason?: string; approvedBy?: Types.ObjectId; approvedAt?: Date; paidAt?: Date; externalPaymentReference?: string;
  disputeReason?: string; disputedAt?: Date; disputedBy?: Types.ObjectId;
}
const schema = new Schema<IInvoice>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
  workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder" }, contractId: { type: Schema.Types.ObjectId, ref: "Contract" },
  invoiceNumber: { type: String, required: true, trim: true }, amount: { type: Number, required: true, min: 0 }, currency: { type: String, default: "NGN" },
  status: { type: String, enum: ["submitted", "under_review", "approved", "rejected", "paid", "disputed"], default: "submitted" },
  submittedAt: { type: Date, default: Date.now }, dueDate: Date, notes: String, rejectionReason: String,
  approvedBy: { type: Schema.Types.ObjectId, ref: "User" }, approvedAt: Date, paidAt: Date, externalPaymentReference: String,
  disputeReason: String, disputedAt: Date, disputedBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
schema.index({ organizationId: 1, invoiceNumber: 1 }, { unique: true });
schema.index({ organizationId: 1, submittedAt: -1 });
schema.index({ organizationId: 1, status: 1, submittedAt: -1 });
export const Invoice = model<IInvoice>("Invoice", schema);
