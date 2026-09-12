export type SubscriptionOwnerType = "organization" | "vendor";
export type SubscriptionPlan = "free" | "starter" | "professional" | "enterprise";

export interface SubscriptionCreatedPayload {
  subscriptionId: string;
  ownerId: string;
  ownerType: SubscriptionOwnerType;
  plan: SubscriptionPlan;
  billingCycle: "monthly" | "annual";
}

export interface SubscriptionActivatedPayload {
  subscriptionId: string;
  ownerId: string;
  ownerType: SubscriptionOwnerType;
  plan: SubscriptionPlan;
  billingCycle: "monthly" | "annual";
  startsAt: string; // ISO 8601
}

export interface SubscriptionUpgradedPayload {
  subscriptionId: string;
  ownerId: string;
  ownerType: SubscriptionOwnerType;
  fromPlan: SubscriptionPlan;
  toPlan: SubscriptionPlan;
  billingCycle: "monthly" | "annual";
}

export interface SubscriptionDowngradedPayload {
  subscriptionId: string;
  ownerId: string;
  ownerType: SubscriptionOwnerType;
  fromPlan: SubscriptionPlan;
  toPlan: SubscriptionPlan;
  billingCycle: "monthly" | "annual";
}

export interface SubscriptionCancelledPayload {
  subscriptionId: string;
  ownerId: string;
  ownerType: SubscriptionOwnerType;
  plan: SubscriptionPlan;
  cancelledAt: string; // ISO 8601
}

export interface SubscriptionExpiredPayload {
  subscriptionId: string;
  ownerId: string;
  ownerType: SubscriptionOwnerType;
  plan: SubscriptionPlan;
  expiredAt: string; // ISO 8601
}
