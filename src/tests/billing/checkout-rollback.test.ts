import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  initiateCheckout: vi.fn(),
}));

vi.mock("@/modules/billing/payment-provider.factory.js", () => ({
  createPaymentProvider: () => ({
    initiateCheckout: mocks.initiateCheckout,
  }),
}));

import { BillingService } from "@/modules/billing/billing.service.js";

describe("billing checkout rollback", () => {
  it("marks provider initialization failures as failed payment attempts", async () => {
    const providerError = new Error("provider unavailable");
    mocks.initiateCheckout.mockRejectedValueOnce(providerError);

    const paymentUpdate = vi.fn();
    const service = new BillingService(
      {
        findById: vi.fn().mockResolvedValue({
          _id: { toString: () => "subscription-1" },
          ownerType: "organization",
          ownerId: "organization-1",
          plan: "starter",
          billingCycle: "monthly",
          status: "trial",
          provider: "mock",
        }),
      } as never,
      {
        findPendingBySubscription: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ _id: { toString: () => "payment-1" } }),
        update: paymentUpdate,
      } as never,
      {} as never,
      {} as never,
    );

    await expect(service.initiateCheckout("subscription-1")).rejects.toBe(providerError);
    expect(paymentUpdate).toHaveBeenCalledWith("payment-1", {
      status: "failed",
      failureReason: "provider unavailable",
    });
  });
});
