import { describe, expect, it, vi } from "vitest";
import { BillingService } from "@/modules/billing/billing.service.js";
import { BillingRepository } from "@/modules/billing/billing.repository.js";
import type { Actor } from "@/shared/types/request.js";

describe("subscription ownership reads", () => {
  it("queries by subscription id and organization owner together", async () => {
    const findByIdForOwner = vi.fn().mockResolvedValue(null);
    const repository = { findByIdForOwner } as unknown as BillingRepository;
    const service = new BillingService(repository);
    const actor: Actor = {
      userId: "user-1",
      role: "admin",
      organizationId: "org-1",
    };

    await expect(service.findSubscription("subscription-1", actor)).rejects.toThrow(
      "Subscription not found.",
    );
    expect(findByIdForOwner).toHaveBeenCalledWith(
      "subscription-1",
      "org-1",
      "organization",
    );
  });

  it("uses the vendor owner boundary for vendor actors", async () => {
    const findByIdForOwner = vi.fn().mockResolvedValue(null);
    const repository = { findByIdForOwner } as unknown as BillingRepository;
    const service = new BillingService(repository);
    const actor: Actor = {
      userId: "user-2",
      role: "vendor_lead",
      vendorId: "vendor-1",
    };

    await expect(service.findSubscription("subscription-1", actor)).rejects.toThrow(
      "Subscription not found.",
    );
    expect(findByIdForOwner).toHaveBeenCalledWith(
      "subscription-1",
      "vendor-1",
      "vendor",
    );
  });
});
