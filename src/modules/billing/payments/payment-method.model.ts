import { Schema, model, type Document, type Types } from "mongoose";
import type { SubscriptionOwnerType } from "../billing.types.js";

export interface IPaymentMethod extends Document {
  ownerType: SubscriptionOwnerType;
  ownerId: Types.ObjectId;
  provider: string;
  providerPaymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPaymentMethod>({
  ownerType: { type: String, enum: ["organization", "vendor"], required: true },
  ownerId: { type: Schema.Types.ObjectId, required: true, index: true },
  provider: { type: String, required: true },
  providerPaymentMethodId: { type: String, required: true },
  brand: { type: String, required: true },
  last4: { type: String, required: true, match: /^\d{4}$/ },
  expMonth: { type: Number, required: true, min: 1, max: 12 },
  expYear: { type: Number, required: true, min: 2000 },
  isDefault: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ ownerType: 1, ownerId: 1, providerPaymentMethodId: 1 }, { unique: true });
export const PaymentMethod = model<IPaymentMethod>("PaymentMethod", schema);
