import { Schema, model } from "mongoose";
import type { IPayment } from "./payment.types.js";
import { BILLING_PLANS } from "../enums/plan.enum.js";
import { PAYMENT_PROVIDERS } from "../enums/payment-provider.enum.js";
import { PAYMENT_STATUSES } from "../enums/payment-status.enum.js";
import { SUBSCRIPTION_STATUSES } from "../enums/subscription-status.enum.js";
import { SUBSCRIPTION_OWNER_TYPES } from "../billing.types.js";

const paymentSchema = new Schema<IPayment>(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },

    ownerType: {
      type: String,
      enum: SUBSCRIPTION_OWNER_TYPES,
      required: true,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: BILLING_PLANS,
      required: true,
    },

    subscriptionStatusAtCheckout: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      required: true,
    },

    provider: {
      type: String,
      enum: PAYMENT_PROVIDERS,
      required: true,
    },

    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      required: true,
      default: "pending",
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },

    providerCheckoutId: { type: String, index: true },
    providerReference: { type: String },
    redirectUrl: { type: String },

    amount: { type: Number },
    currency: { type: String },

    failureReason: { type: String },
  },
  {
    timestamps: true,
  },
);

export const Payment = model<IPayment>("Payment", paymentSchema);
