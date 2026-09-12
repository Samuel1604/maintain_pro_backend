export const BillingEvents = {
  // Subscription lifecycle
  SUBSCRIPTION_CREATED: "billing.subscription.created",
  SUBSCRIPTION_ACTIVATED: "billing.subscription.activated",
  SUBSCRIPTION_UPGRADED: "billing.subscription.upgraded",
  SUBSCRIPTION_DOWNGRADED: "billing.subscription.downgraded",
  SUBSCRIPTION_CANCELLED: "billing.subscription.cancelled",
  SUBSCRIPTION_EXPIRED: "billing.subscription.expired",
} as const;

export type BillingEventName = (typeof BillingEvents)[keyof typeof BillingEvents];
