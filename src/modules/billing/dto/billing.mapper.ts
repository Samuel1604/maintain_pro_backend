import { toIsoString, toObjectIdString } from "@/shared/validators/index.js";
import type { ISubscription } from "../billing.types.js";
import type { SubscriptionResponse } from "./billing.dto.js";

export class BillingMapper {
  toSubscriptionResponse(subscription: ISubscription): SubscriptionResponse {
    return {
      id: toObjectIdString(subscription._id)!,
      ownerType: subscription.ownerType,
      plan: subscription.plan,
      billingCycle: subscription.billingCycle || "monthly",
      status: subscription.status,
      provider: subscription.provider || "mock",
      trialEndsAt: toIsoString(subscription.trialEndsAt),
      startsAt: toIsoString(subscription.startsAt)!,
      endsAt: toIsoString(subscription.endsAt),
      createdAt: toIsoString(subscription.createdAt)!,
      updatedAt: toIsoString(subscription.updatedAt)!,
    };
  }
}

// Singleton instance — controllers import this, not the class directly
export const billingMapper = new BillingMapper();
