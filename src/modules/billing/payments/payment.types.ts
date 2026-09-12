import type { Document, Types } from "mongoose";
import type { BillingPlan } from "../enums/plan.enum.js";
import type { PaymentProvider } from "../enums/payment-provider.enum.js";
import type { PaymentStatus } from "../enums/payment-status.enum.js";
import type { SubscriptionOwnerType } from "../billing.types.js";
import type { SubscriptionStatus } from "../enums/subscription-status.enum.js";

/**
 * A single checkout/payment attempt against a Subscription.
 *
 * Separated from Subscription itself so that "checkout was initiated"
 * and "subscription is active" are never conflated — a Subscription only
 * ever changes status once a Payment on it reaches "succeeded" (via
 * provider webhook verification) or the subscription lifecycle otherwise
 * decides to (cancel, expire).
 */
export interface IPayment extends Document {
  subscriptionId: Types.ObjectId;

  // Denormalized from the subscription at creation time — same
  // ownership-scoping shape Subscription itself uses, so payment queries
  // can be tenant-scoped without a join.
  ownerType: SubscriptionOwnerType;
  ownerId: Types.ObjectId;

  // The plan this checkout attempt is paying for. Usually the
  // subscription's current plan (renewal) or a newly selected one
  // (initial signup / recovery).
  plan: BillingPlan;

  // The subscription's status at the moment this checkout was created.
  // Lets webhook handling tell an initial/recovery payment apart from a
  // renewal payment when deciding what a *failure* should do (stay on
  // trial vs. drop an active subscription to past_due).
  subscriptionStatusAtCheckout: SubscriptionStatus;

  provider: PaymentProvider;
  status: PaymentStatus;

  // Caller-supplied (or server-generated) idempotency key. Unique —
  // retried checkout requests with the same key must resolve to this
  // same Payment record rather than creating a second one.
  idempotencyKey: string;

  // Provider-side identifiers. providerCheckoutId identifies the
  // checkout session/order created at initiation; providerReference is
  // set once verification succeeds (provider's terms: charge id,
  // transaction reference, etc.).
  providerCheckoutId?: string;
  providerReference?: string;

  // The URL the client was sent to at initiation. Persisted so a
  // deduped retry of an in-flight checkout can hand back the same
  // destination without needing to ask the provider to regenerate one.
  redirectUrl?: string;

  amount?: number;
  currency?: string;

  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
