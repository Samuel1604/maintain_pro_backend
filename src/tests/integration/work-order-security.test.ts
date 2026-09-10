/**
 * Work Order Security Integration Tests
 *
 * Verifies vendor-scoped access control:
 * - VENDOR_LEAD can only access work orders assigned to their vendor
 * - VENDOR_TECHNICIAN can only access work orders assigned to them personally
 * - An unrelated vendor receives 404 on the other org's work orders
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import { Types } from "mongoose";
import { createTestApp } from "@/tests/helpers/app.js";
import { loginAsOrganizationAdmin, loginAsVendorLead } from "@/tests/helpers/auth.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { VendorFactory } from "@/tests/factories/vendor.factory.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { AppContainer } from "@/container/app.container.js";
import { ROLES } from "@/shared/constants/roles.js";

function accessCookie(token: string) { return [`accessToken=${token}`]; }

async function csrfAgent(app: Awaited<ReturnType<typeof createTestApp>>, token: string) {
  const health = await request(app).get("/api/v1/health");
  const raw = health.headers["set-cookie"];
  const cookies = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const csrf = cookies.find((v: string) => v.startsWith("csrfToken="))?.match(/csrfToken=([^;]+)/)?.[1];
  if (!csrf) throw new Error("CSRF cookie not issued");
  return request.agent(app).set("Cookie", [...accessCookie(token), `csrfToken=${csrf}`]).set("X-CSRF-Token", csrf);
}

describe("Work Order Vendor Scoping", () => {
  it("vendor lead can access a work order assigned to their vendor", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();
    const adminClient = await csrfAgent(app, admin.accessToken);

    const vendor = await VendorFactory.create();
    const vendorLead = await loginAsVendorLead({ vendorId: vendor._id });

    // Create a work order and assign it to the vendor
    const facility = await adminClient.post("/api/v1/facilities").send({ name: "Test Facility", address: { street: "1 St", city: "Lagos", state: "LA", postalCode: "100001", country: "NG" } });
    const workOrder = await WorkOrder.create({
      organizationId: admin.user.organizationId!,
      facilityId: facility.body.data?.id ?? new Types.ObjectId(),
      assetId: new Types.ObjectId(),
      title: "Vendor WO",
      description: "Work order for vendor",
      priority: "medium",
      serviceCategory: "HVAC",
      fulfillmentType: "marketplace",
      status: "assigned",
      assignedVendorId: vendor._id,
      createdBy: admin.user._id,
    });

    const vendorClient = await csrfAgent(app, vendorLead.accessToken);
    const res = await vendorClient.get(`/api/v1/work-orders/${workOrder._id}`);
    expect(res.status).toBe(200);
    // Raw Mongoose document: serialises as _id (no DTO mapper on this endpoint)
    expect(res.body.data._id).toBe(workOrder._id.toString());
  });

  it("vendor lead cannot access a work order assigned to a different vendor", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();

    const vendorA = await VendorFactory.create();
    const vendorB = await VendorFactory.create();
    const vendorBLead = await loginAsVendorLead({ vendorId: vendorB._id });

    const workOrder = await WorkOrder.create({
      organizationId: admin.user.organizationId!,
      facilityId: new Types.ObjectId(),
      assetId: new Types.ObjectId(),
      title: "Private WO",
      description: "Work order for vendor A only",
      priority: "medium",
      serviceCategory: "Plumbing",
      fulfillmentType: "marketplace",
      status: "assigned",
      assignedVendorId: vendorA._id,
      createdBy: admin.user._id,
    });

    const vendorBClient = await csrfAgent(app, vendorBLead.accessToken);
    const res = await vendorBClient.get(`/api/v1/work-orders/${workOrder._id}`);
    expect(res.status).toBe(404);
  });

  it("vendor technician can only access their personally assigned work order", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();

    const vendor = await VendorFactory.create();
    const { user: techUser, rawPassword } = await UserFactory.create({
      role: ROLES.VENDOR_TECHNICIAN,
      vendorId: vendor._id,
      isVerified: true,
    });

    const container = new AppContainer();
    const techLogin = await container.authService.login({ email: techUser.email, password: rawPassword }, { ipAddress: "127.0.0.1", userAgent: "Vitest" });
    const techToken = techLogin.data!.accessToken;

    const workOrder = await WorkOrder.create({
      organizationId: admin.user.organizationId!,
      facilityId: new Types.ObjectId(),
      assetId: new Types.ObjectId(),
      title: "Tech WO",
      description: "Assigned to specific technician",
      priority: "low",
      serviceCategory: "Electrical",
      fulfillmentType: "marketplace",
      status: "assigned",
      assignedVendorId: vendor._id,
      assignedVendorTechnicianId: techUser._id,
      createdBy: admin.user._id,
    });

    const techClient = await csrfAgent(app, techToken);
    const myWO = await techClient.get(`/api/v1/work-orders/${workOrder._id}`);
    expect(myWO.status).toBe(200);

    // A different technician on the same vendor should NOT see this WO
    const { user: otherTech, rawPassword: otherPwd } = await UserFactory.create({
      role: ROLES.VENDOR_TECHNICIAN,
      vendorId: vendor._id,
      isVerified: true,
    });
    const otherLogin = await container.authService.login({ email: otherTech.email, password: otherPwd }, { ipAddress: "127.0.0.1", userAgent: "Vitest" });
    const otherClient = await csrfAgent(app, otherLogin.data!.accessToken);
    const notMyWO = await otherClient.get(`/api/v1/work-orders/${workOrder._id}`);
    expect(notMyWO.status).toBe(404);
  });
});
