// ─── Config ──────────────────────────────────────────────────────────────────
export { BILLING_CONFIG } from "./billing.config.js";

// ─── Policy ──────────────────────────────────────────────────────────────────
export { SubscriptionPolicy } from "./billing.policy.js";

// ─── Model ────────────────────────────────────────────────────────────────────
export { Subscription } from "./billing.model.js";

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  ISubscription,
  SubscriptionOwnerType,
} from "./billing.types.js";
export { SUBSCRIPTION_OWNER_TYPES } from "./billing.types.js";

// ─── Enums ────────────────────────────────────────────────────────────────────
export { BILLING_PLANS } from "./enums/plan.enum.js";
export type { BillingPlan } from "./enums/plan.enum.js";

export { SUBSCRIPTION_STATUSES } from "./enums/subscription-status.enum.js";
export type { SubscriptionStatus } from "./enums/subscription-status.enum.js";

export { PAYMENT_PROVIDERS } from "./enums/payment-provider.enum.js";
export type { PaymentProvider } from "./enums/payment-provider.enum.js";

// ─── Schemas ──────────────────────────────────────────────────────────────────
export {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  changePlanSchema,
} from "./billing.schema.js";
export type {
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  ChangePlanInput,
} from "./billing.schema.js";

// ─── DTO ──────────────────────────────────────────────────────────────────────
export type { SubscriptionResponse } from "./dto/billing.dto.js";
export { BillingMapper, billingMapper } from "./dto/billing.mapper.js";

// ─── Repository ───────────────────────────────────────────────────────────────
export { BillingRepository } from "./billing.repository.js";

// ─── Service ──────────────────────────────────────────────────────────────────
export { BillingService } from "./billing.service.js";

// ─── Router ───────────────────────────────────────────────────────────────────
export { default as billingRouter } from "./billing.routes.js";
