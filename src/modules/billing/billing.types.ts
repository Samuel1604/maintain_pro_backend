import type { Document, Types } from "mongoose";
import type { BillingPlan } from "./enums/plan.enum.js";
import type { SubscriptionStatus } from "./enums/subscription-status.enum.js";
import type { PaymentProvider } from "./enums/payment-provider.enum.js";

// ─── Owner ────────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_OWNER_TYPES = ["organization", "vendor"] as const;

export type SubscriptionOwnerType = (typeof SUBSCRIPTION_OWNER_TYPES)[number];

// ─── Billing Cycle ─────────────────────────────────────────────────────────────

export const BILLING_CYCLES = ["monthly", "annual"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface ISubscription extends Document {
  // Owner
  ownerType: SubscriptionOwnerType;
  ownerId: Types.ObjectId;

  // Plan & Cycle
  plan: BillingPlan;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;

  // Provider
  provider: PaymentProvider;
  providerSubscriptionId?: string;

  // Lifecycle dates
  trialEndsAt?: Date;
  startsAt: Date;
  endsAt?: Date;
  cancelledAt?: Date;

  // Timestamps (from Mongoose)
  createdAt: Date;
  updatedAt: Date;
}
