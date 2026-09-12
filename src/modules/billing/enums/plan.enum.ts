export const BILLING_PLANS = [
  "free",
  "starter",
  "professional",
  "enterprise",
] as const;

export type BillingPlan = (typeof BILLING_PLANS)[number];
