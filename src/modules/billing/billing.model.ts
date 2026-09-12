import { Schema, model } from "mongoose";
import type { ISubscription } from "./billing.types.js";
import { BILLING_PLANS } from "./enums/plan.enum.js";
import { SUBSCRIPTION_STATUSES } from "./enums/subscription-status.enum.js";
import { PAYMENT_PROVIDERS } from "./enums/payment-provider.enum.js";
import { SUBSCRIPTION_OWNER_TYPES, BILLING_CYCLES } from "./billing.types.js";

const subscriptionSchema = new Schema<ISubscription>(
  {
    // Owner — polymorphic ref (Organization or Vendor)
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

    // Plan & Cycle
    plan: {
      type: String,
      enum: BILLING_PLANS,
      required: true,
    },

    billingCycle: {
      type: String,
      enum: BILLING_CYCLES,
      required: true,
      default: "monthly",
    },

    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      required: true,
      default: "trial",
    },

    // Provider
    provider: {
      type: String,
      enum: PAYMENT_PROVIDERS,
      required: true,
      default: "mock",
    },

    providerSubscriptionId: {
      type: String,
    },

    // Lifecycle dates
    trialEndsAt: { type: Date },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    cancelledAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

// Compound index: one active subscription per owner
subscriptionSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });

export const Subscription = model<ISubscription>(
  "Subscription",
  subscriptionSchema,
);
