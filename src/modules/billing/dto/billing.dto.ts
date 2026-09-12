import type { BillingPlan } from "../enums/plan.enum.js";
import type { SubscriptionStatus } from "../enums/subscription-status.enum.js";
import type { SubscriptionOwnerType, BillingCycle } from "../billing.types.js";
import type { PaymentProvider } from "../enums/payment-provider.enum.js";

export interface SubscriptionResponse {
  id: string;
  ownerType: SubscriptionOwnerType;
  plan: BillingPlan;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  trialEndsAt?: string;
  startsAt: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
}
