import {
  BusinessException,
  ConflictException,
  ValidationException,
} from "@/shared/errors/index.js";
import { BILLING_PLANS } from "./enums/plan.enum.js";
import type { BillingPlan } from "./enums/plan.enum.js";
import type { ISubscription, SubscriptionOwnerType } from "./billing.types.js";
import { SUBSCRIPTION_OWNER_TYPES } from "./billing.types.js";

// ─── Plan Hierarchy ───────────────────────────────────────────────────────────
//
// Index position = tier rank. Higher index = higher plan.

const PLAN_RANK = Object.fromEntries(
  BILLING_PLANS.map((plan, index) => [plan, index]),
) as Record<BillingPlan, number>;

// ─── Subscription Policy ──────────────────────────────────────────────────────

/**
 * Contains ALL subscription state-transition rules.
 *
 * Rules:
 *  - No database access.
 *  - Static methods only.
 *  - Throws domain exceptions on violation.
 *  - BillingService calls this before every state change.
 */
export class SubscriptionPolicy {
  // ─── Owner ──────────────────────────────────────────────────────────────────

  /**
   * Validates that ownerType is a supported billing owner.
   * Throws ValidationException if invalid.
   */
  static validateOwnerType(ownerType: string): asserts ownerType is SubscriptionOwnerType {
    if (!(SUBSCRIPTION_OWNER_TYPES as readonly string[]).includes(ownerType)) {
      throw new ValidationException(
        `Invalid owner type "${ownerType}". Must be one of: ${SUBSCRIPTION_OWNER_TYPES.join(", ")}.`,
      );
    }
  }

  // ─── Activation ─────────────────────────────────────────────────────────────

  /**
   * Validates that a subscription may transition to "active".
   *
   * Allowed transition: trial → active
   */
  static canActivate(subscription: ISubscription): void {
    if (subscription.status === "active") {
      throw new ConflictException("Subscription is already active.");
    }

    if (subscription.status === "cancelled") {
      throw new BusinessException(
        "A cancelled subscription cannot be activated. Create a new subscription instead.",
      );
    }

    if (subscription.status === "expired") {
      throw new BusinessException(
        "An expired subscription cannot be activated. Create a new subscription instead.",
      );
    }
  }

  // ─── Cancellation ────────────────────────────────────────────────────────────

  /**
   * Validates that a subscription may be cancelled.
   */
  static canCancel(subscription: ISubscription): void {
    if (subscription.status === "cancelled") {
      throw new ConflictException("Subscription is already cancelled.");
    }

    if (subscription.status === "expired") {
      throw new BusinessException(
        "An expired subscription cannot be cancelled.",
      );
    }
  }

  /**
   * Plan changes are allowed while a subscription is live or in recovery,
   * but terminal subscriptions must be recreated before they can be changed.
   */
  static canChangePlan(subscription: ISubscription): void {
    if (subscription.status === "cancelled" || subscription.status === "expired") {
      throw new BusinessException(
        `Cannot change plan for a ${subscription.status} subscription.`,
      );
    }
  }

  // ─── Plan Changes ────────────────────────────────────────────────────────────

  /**
   * Validates that a plan upgrade is permitted.
   *
   * Rules:
   *  - New plan must differ from the current plan.
   *  - New plan must be at a higher tier.
   */
  static canUpgrade(currentPlan: BillingPlan, newPlan: BillingPlan): void {
    if (currentPlan === newPlan) {
      throw new ConflictException(
        `Subscription is already on the "${currentPlan}" plan.`,
      );
    }

    if (PLAN_RANK[newPlan] <= PLAN_RANK[currentPlan]) {
      throw new BusinessException(
        `Cannot upgrade from "${currentPlan}" to "${newPlan}". "${newPlan}" is a lower tier.`,
      );
    }
  }

  /**
   * Validates that a plan downgrade is permitted.
   *
   * Rules:
   *  - New plan must differ from the current plan.
   *  - New plan must be at a lower tier.
   *  - Cannot downgrade below "free".
   */
  static canDowngrade(currentPlan: BillingPlan, newPlan: BillingPlan): void {
    if (currentPlan === newPlan) {
      throw new ConflictException(
        `Subscription is already on the "${currentPlan}" plan.`,
      );
    }

    if (PLAN_RANK[newPlan] >= PLAN_RANK[currentPlan]) {
      throw new BusinessException(
        `Cannot downgrade from "${currentPlan}" to "${newPlan}". "${newPlan}" is not a lower tier.`,
      );
    }

    // "free" has rank 0 — nothing is below it, so this check is implicit via the
    // rank comparison above. Kept explicit for clarity.
    if (newPlan === "free" && currentPlan === "free") {
      throw new BusinessException("Cannot downgrade below the free plan.");
    }
  }

  // ─── Trial Expiration ────────────────────────────────────────────────────────

  /**
   * Validates that a trial subscription may be expired.
   *
   * Rules:
   *  - Status must be "trial".
   *  - trialEndsAt must be set.
   *  - Current date must be >= trialEndsAt.
   */
  static canExpireTrial(subscription: ISubscription): void {
    if (subscription.status !== "trial") {
      throw new BusinessException(
        `Cannot expire trial: subscription status is "${subscription.status}", not "trial".`,
      );
    }

    if (!subscription.trialEndsAt) {
      throw new BusinessException(
        "Cannot expire trial: subscription has no trial end date.",
      );
    }

    if (new Date() < subscription.trialEndsAt) {
      throw new BusinessException(
        "Cannot expire trial: trial period has not ended yet.",
      );
    }
  }
}
