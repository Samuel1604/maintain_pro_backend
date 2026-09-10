import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { OrganizationFactory } from "@/tests/factories/organization.factory.js";
import { UserFactory } from "@/tests/factories/user.factory.js";

describe("work-order concurrency invariants", () => {
  it("persists only one work order for concurrent service-request conversion", async () => {
    const organization = await OrganizationFactory.create();
    const { user } = await UserFactory.create({ organizationId: organization._id, isVerified: true });
    const serviceRequestId = new Types.ObjectId();
    const base = {
      organizationId: organization._id,
      facilityId: new Types.ObjectId(),
      serviceRequestId,
      assetId: new Types.ObjectId(),
      title: "Concurrent conversion",
      description: "Only one work order may be created",
      priority: "medium" as const,
      serviceCategory: "HVAC",
      fulfillmentType: "internal" as const,
      status: "assigned" as const,
      assignedTechnicianId: user._id,
      createdBy: user._id,
    };

    // Production migrations must complete index creation before accepting
    // writes; do not rely on Mongoose's background auto-index timing.
    await WorkOrder.createIndexes();

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => WorkOrder.create(base)),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(9);
    expect(await WorkOrder.countDocuments({ serviceRequestId })).toBe(1);
  });
});
