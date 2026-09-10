import { describe, expect, it } from "vitest";
import request from "supertest";
import { Types } from "mongoose";
import { createTestApp } from "@/tests/helpers/app.js";
import {
  loginAsOrganizationAdmin,
  loginAsVendorLead,
} from "@/tests/helpers/auth.js";
import { OrganizationFactory } from "@/tests/factories/organization.factory.js";
import { VendorFactory } from "@/tests/factories/vendor.factory.js";
import { Facility } from "@/modules/facilities/facility.model.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { OrganizationVendorRelationship } from "@/modules/organizations/vendor-relationships/organization-vendor.model.js";
import { FacilityVendor } from "@/modules/organizations/vendor-relationships/facility-vendor.model.js";
import { MarketplaceGeographicPolicy } from "@/modules/organizations/marketplace-geographic-policy.model.js";

const cookies = (token: string) => [`accessToken=${token}`];
async function csrf(
  app: Awaited<ReturnType<typeof createTestApp>>,
  token: string,
) {
  const response = await request(app).get("/api/v1/health");
  const setCookie = response.headers["set-cookie"];
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const header = cookieHeader?.match(/csrfToken=([^;]+)/)?.[1] ?? "";
  if (!header) throw new Error("Test CSRF cookie was not issued");
  return request
    .agent(app)
    .set("Cookie", [...cookies(token), `csrfToken=${header}`])
    .set("X-CSRF-Token", header);
}

describe("Marketplace geographic policy and applications", () => {
  it("manages organization policies and rejects duplicate active priorities", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();
    const client = await csrf(app, accessToken);
    const created = await client
      .post("/api/v1/organizations/me/marketplace/geographic-policies")
      .send({ priority: "critical", maxDistanceKm: 25, enabled: true });
    expect(created.status).toBe(201);
    expect(created.body.data.maxDistanceKm).toBe(25);
    const duplicate = await (await csrf(app, accessToken))
      .post("/api/v1/organizations/me/marketplace/geographic-policies")
      .send({ priority: "critical", maxDistanceKm: 20, enabled: true });
    expect(duplicate.status).toBe(409);
    const id = created.body.data.id;
    const retrieved = await request(app)
      .get(`/api/v1/organizations/me/marketplace/geographic-policies/${id}`)
      .set("Cookie", cookies(accessToken));
    expect(retrieved.status).toBe(200);
    const disabled = await (
      await csrf(app, accessToken)
    ).post(
      `/api/v1/organizations/me/marketplace/geographic-policies/${id}/deactivate`,
    );
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.enabled).toBe(false);
  });

  it("does not expose marketplace work orders without an active priority policy or outside the configured distance", async () => {
    const app = await createTestApp();
    const org = await OrganizationFactory.create();
    const vendor = await VendorFactory.create({
      serviceCategories: ["HVAC"],
      coverageRadiusKm: 100,
      baseCoordinates: { type: "Point", coordinates: [3.3792, 6.5244] },
    });
    const { accessToken } = await loginAsVendorLead({
      vendorId: vendor._id,
      organizationId: undefined,
    });
    const facility = await Facility.create({
      organizationId: org._id,
      name: "Lagos Facility",
      address: { street: "A", city: "Lagos", state: "LA", country: "NG" },
      coordinates: { type: "Point", coordinates: [3.3792, 6.5244] },
      createdBy: new Types.ObjectId(),
    });
    await OrganizationVendorRelationship.create({
      organizationId: org._id,
      vendorId: vendor._id,
      status: "active",
      createdBy: new Types.ObjectId(),
    });
    await FacilityVendor.create({
      organizationId: org._id,
      facilityId: facility._id,
      vendorId: vendor._id,
      createdBy: new Types.ObjectId(),
    });
    const workOrder = await WorkOrder.create({
      organizationId: org._id,
      facilityId: facility._id,
      assetId: new Types.ObjectId(),
      title: "HVAC check",
      description: "Check",
      priority: "critical",
      serviceCategory: "HVAC",
      fulfillmentType: "marketplace",
      status: "open",
      createdBy: new Types.ObjectId(),
    });
    const missingPolicy = await request(app)
      .get("/api/v1/work-orders/marketplace/open")
      .set("Cookie", cookies(accessToken));
    expect(missingPolicy.status).toBe(200);
    expect(missingPolicy.body.data).toHaveLength(0);
    await MarketplaceGeographicPolicy.create({
      organizationId: org._id,
      priority: "critical",
      maxDistanceKm: 1,
      enabled: true,
      createdBy: new Types.ObjectId(),
    });
    const visible = await request(app)
      .get("/api/v1/work-orders/marketplace/open")
      .set("Cookie", cookies(accessToken));
    expect(visible.status).toBe(200);
    expect(visible.body.data).toHaveLength(1);
    expect(visible.body.data[0].id ?? visible.body.data[0]._id).toBe(
      workOrder._id.toString(),
    );
  });

  it("submits and awards one eligible vendor application through the existing Work Order", async () => {
    const app = await createTestApp();
    const org = await OrganizationFactory.create();
    const vendor = await VendorFactory.create({
      serviceCategories: ["HVAC"],
      coverageRadiusKm: 100,
      baseCoordinates: { type: "Point", coordinates: [3.3792, 6.5244] },
    });
    const { accessToken } = await loginAsVendorLead({ vendorId: vendor._id });
    const facility = await Facility.create({
      organizationId: org._id,
      name: "Facility",
      address: { street: "A", city: "Lagos", state: "LA", country: "NG" },
      coordinates: { type: "Point", coordinates: [3.3792, 6.5244] },
      createdBy: new Types.ObjectId(),
    });
    const wo = await WorkOrder.create({
      organizationId: org._id,
      facilityId: facility._id,
      assetId: new Types.ObjectId(),
      title: "HVAC",
      description: "Repair",
      priority: "high",
      serviceCategory: "HVAC",
      fulfillmentType: "marketplace",
      status: "open",
      createdBy: new Types.ObjectId(),
    });
    await OrganizationVendorRelationship.create({
      organizationId: org._id,
      vendorId: vendor._id,
      status: "active",
      createdBy: new Types.ObjectId(),
    });
    await FacilityVendor.create({
      organizationId: org._id,
      facilityId: facility._id,
      vendorId: vendor._id,
      createdBy: new Types.ObjectId(),
    });
    await MarketplaceGeographicPolicy.create({
      organizationId: org._id,
      priority: "high",
      maxDistanceKm: 50,
      enabled: true,
      createdBy: new Types.ObjectId(),
    });
    const submitted = await (await csrf(app, accessToken))
      .post("/api/v1/vendor-applications")
      .send({ workOrderId: wo._id.toString(), note: "Available tomorrow" });
    expect(submitted.status).toBe(201);
    const orgAuth = await loginAsOrganizationAdmin({ organizationId: org._id });
    const reviewed = await (await csrf(app, orgAuth.accessToken))
      .patch(`/api/v1/vendor-applications/${submitted.body.data.id}/status`)
      .send({ status: "awarded" });
    expect(reviewed.status).toBe(200);
    const saved = await WorkOrder.findById(wo._id);
    expect(saved?.assignedVendorId?.toString()).toBe(vendor._id.toString());
    expect(saved?.status).toBe("assigned");
  });
});
