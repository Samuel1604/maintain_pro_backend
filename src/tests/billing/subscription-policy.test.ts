import { describe, expect, it } from "vitest";
import { SubscriptionPolicy } from "@/modules/billing/billing.policy.js";

const subscription = (status: "trial" | "active" | "past_due" | "cancelled" | "expired", plan: "free" | "starter" | "professional" | "enterprise" = "starter") => ({
  status,
  plan,
  trialEndsAt: new Date(Date.now() - 1_000),
}) as never;

describe("subscription state policy", () => {
  it("allows trial activation and rejects repeated or terminal activation", () => {
    expect(() => SubscriptionPolicy.canActivate(subscription("trial"))).not.toThrow();
    expect(() => SubscriptionPolicy.canActivate(subscription("active"))).toThrow("already active");
    expect(() => SubscriptionPolicy.canActivate(subscription("cancelled"))).toThrow("cancelled");
    expect(() => SubscriptionPolicy.canActivate(subscription("expired"))).toThrow("expired");
  });

  it("allows cancellation only for cancellable states", () => {
    expect(() => SubscriptionPolicy.canCancel(subscription("trial"))).not.toThrow();
    expect(() => SubscriptionPolicy.canCancel(subscription("active"))).not.toThrow();
    expect(() => SubscriptionPolicy.canCancel(subscription("past_due"))).not.toThrow();
    expect(() => SubscriptionPolicy.canCancel(subscription("cancelled"))).toThrow("already cancelled");
    expect(() => SubscriptionPolicy.canCancel(subscription("expired"))).toThrow("expired");
  });

  it("enforces plan direction and trial expiration", () => {
    expect(() => SubscriptionPolicy.canUpgrade("starter", "professional")).not.toThrow();
    expect(() => SubscriptionPolicy.canUpgrade("professional", "starter")).toThrow("lower tier");
    expect(() => SubscriptionPolicy.canDowngrade("professional", "starter")).not.toThrow();
    expect(() => SubscriptionPolicy.canDowngrade("starter", "professional")).toThrow("not a lower tier");
    expect(() => SubscriptionPolicy.canExpireTrial(subscription("trial"))).not.toThrow();
    expect(() => SubscriptionPolicy.canExpireTrial(subscription("active"))).toThrow("not \"trial\"");
  });
});
