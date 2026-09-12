import { z } from "zod";
import { BILLING_PLANS } from "./enums/plan.enum.js";
import { SUBSCRIPTION_STATUSES } from "./enums/subscription-status.enum.js";
import { PAYMENT_PROVIDERS } from "./enums/payment-provider.enum.js";
import { SUBSCRIPTION_OWNER_TYPES, BILLING_CYCLES } from "./billing.types.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

// ─── Create Subscription ──────────────────────────────────────────────────────

export const createSubscriptionSchema = z.object({
  ownerType: z.enum(SUBSCRIPTION_OWNER_TYPES).optional(),
  ownerId: objectId.optional(),
  plan: z.enum(BILLING_PLANS),
  billingCycle: z.enum(BILLING_CYCLES).optional().default("monthly"),
  provider: z.enum(PAYMENT_PROVIDERS).optional(),
  providerSubscriptionId: z.string().trim().optional(),
  startsAt: z.coerce.date().optional(),
  trialEndsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

// ─── Update Subscription ──────────────────────────────────────────────────────

export const updateSubscriptionSchema = z.object({
  plan: z.enum(BILLING_PLANS).optional(),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  providerSubscriptionId: z.string().trim().optional(),
  trialEndsAt: z.coerce.date().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

// ─── Change Plan ──────────────────────────────────────────────────────────────

export const changePlanSchema = z.object({
  plan: z.enum(BILLING_PLANS),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
