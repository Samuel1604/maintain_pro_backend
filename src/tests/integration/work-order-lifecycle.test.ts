/**
 * Work Order Lifecycle Integration Tests
 *
 * Verifies:
 * - Transitioning to on_hold requires a reason
 * - statusHistory is recorded with reason
 * - Vendor accept/reject flows update vendorOfferStatus correctly
 * - Invoice creation is guarded by work order status
 * - Invoice dispute saves disputeReason, disputedAt, disputedBy
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import { Types } from "mongoose";
import { createTestApp } from "@/tests/helpers/app.js";
import { loginAsOrganizationAdmin, loginAsVendorLead } from "@/tests/helpers/auth.js";
import { WorkOrder } from "@/modules/work-orders/work-order.model.js";
import { Invoice } from "@/modules/invoices/invoice.model.js";
import { VendorFactory } from "@/tests/factories/vendor.factory.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { ROLES } from "@/shared/constants/roles.js";
import { AppContainer } from "@/container/app.container.js";

function accessCookie(token: string) { return [`accessToken=${token}`]; }
async function csrfAgent(app: Awaited<ReturnType<typeof createTestApp>>, token: string) {
  const health = await request(app).get("/api/v1/health");
  const raw = health.headers["set-cookie"];
  const cookies = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const csrf = cookies.find((v: string) => v.startsWith("csrfToken="))?.match(/csrfToken=([^;]+)/)?.[1];
  if (!csrf) throw new Error("CSRF cookie not issued");
  return request.agent(app).set("Cookie", [...accessCookie(token), `csrfToken=${csrf}`]).set("X-CSRF-Token", csrf);
}

describe("Work Order Lifecycle", () => {
  it("transition to on_hold requires a reason", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();

    const { user: tech, rawPassword } = await UserFactory.create({
      role: ROLES.TECHNICIAN,
      organizationId: admin.user.organizationId,
      isVerified: true,
    });

    const wo = await WorkOrder.create({
      organizationId: admin.user.organizationId!,
      facilityId: new Types.ObjectId(),
      assetId: new Types.ObjectId(),
      title: "Hold Test WO",
      description: "Testing hold transition",
      priority: "medium",
      serviceCategory: "HVAC",
      fulfillmentType: "internal",
      status: "in_progress",
      assignedTechnicianId: tech._id,
      createdBy: admin.user._id,
    });

    const container = new AppContainer();
    const techLogin = await container.authService.login({ email: tech.email, password: rawPassword }, { ipAddress: "127.0.0.1", userAgent: "Vitest" });
    const techClient = await csrfAgent(app, techLogin.data!.accessToken);

    // Missing reason → Zod superRefine fires, ZodError → ValidationException → HTTP 400
    const noReason = await techClient.post(`/api/v1/work-orders/${wo._id}/transition`).send({ status: "on_hold" });
    expect(noReason.status).toBe(400);

    // With reason → should succeed
    const withReason = await techClient.post(`/api/v1/work-orders/${wo._id}/transition`).send({ status: "on_hold", reason: "Awaiting parts delivery" });
    expect(withReason.status).toBe(200);

    // statusHistory entry should be recorded
    const updated = await WorkOrder.findById(wo._id);
    expect(updated!.statusHistory).toBeDefined();
    expect(updated!.statusHistory).toHaveLength(1);
    expect(updated!.statusHistory![0]!.status).toBe("on_hold");
    expect(updated!.statusHistory![0]!.reason).toBe("Awaiting parts delivery");
  });

  it("vendor accept updates vendorOfferStatus and records accepted", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();

    const vendor = await VendorFactory.create();
    const vendorLead = await loginAsVendorLead({ vendorId: vendor._id });

    const wo = await WorkOrder.create({
      organizationId: admin.user.organizationId!,
      facilityId: new Types.ObjectId(),
      assetId: new Types.ObjectId(),
      title: "Accept Test WO",
      description: "Vendor must accept",
      priority: "high",
      serviceCategory: "Plumbing",
      fulfillmentType: "marketplace",
      status: "assigned",
      assignedVendorId: vendor._id,
      vendorOfferStatus: "pending_acceptance",
      createdBy: admin.user._id,
    });

    const vendorClient = await csrfAgent(app, vendorLead.accessToken);
    const res = await vendorClient.post(`/api/v1/work-orders/${wo._id}/vendor/accept`).send({});
    expect(res.status).toBe(200);

    const updated = await WorkOrder.findById(wo._id);
    expect(updated!.vendorOfferStatus).toBe("accepted");
  });

  it("vendor reject clears assignment and reverts status to open", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();

    const vendor = await VendorFactory.create();
    const vendorLead = await loginAsVendorLead({ vendorId: vendor._id });

    const wo = await WorkOrder.create({
      organizationId: admin.user.organizationId!,
      facilityId: new Types.ObjectId(),
      assetId: new Types.ObjectId(),
      title: "Reject Test WO",
      description: "Vendor will reject",
      priority: "medium",
      serviceCategory: "Electrical",
      fulfillmentType: "marketplace",
      status: "assigned",
      assignedVendorId: vendor._id,
      vendorOfferStatus: "pending_acceptance",
      createdBy: admin.user._id,
    });

    const vendorClient = await csrfAgent(app, vendorLead.accessToken);
    const res = await vendorClient.post(`/api/v1/work-orders/${wo._id}/vendor/reject`).send({ reason: "Too far from our service area" });
    expect(res.status).toBe(200);

    const updated = await WorkOrder.findById(wo._id);
    expect(updated!.vendorOfferStatus).toBe("rejected");
    expect(updated!.status).toBe("open");
    expect(updated!.assignedVendorId).toBeUndefined();
  });

  it("vendor cannot submit invoice if work order is not pending_completion or completed", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();

    const vendor = await VendorFactory.create();
    const vendorLead = await loginAsVendorLead({ vendorId: vendor._id });

    const wo = await WorkOrder.create({
      organizationId: admin.user.organizationId!,
      facilityId: new Types.ObjectId(),
      assetId: new Types.ObjectId(),
      title: "Invoice Guard WO",
      description: "Still in progress",
      priority: "medium",
      serviceCategory: "HVAC",
      fulfillmentType: "marketplace",
      status: "in_progress",
      assignedVendorId: vendor._id,
      createdBy: admin.user._id,
    });

    const vendorClient = await csrfAgent(app, vendorLead.accessToken);
    const res = await vendorClient.post(`/api/v1/work-orders/${wo._id}/invoice`).send({
      invoiceNumber: "INV-001",
      amount: 50000,
    });
    expect(res.status).toBe(422);
  });

  it("dispute stores structured fields on the invoice", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();
    const adminClient = await csrfAgent(app, admin.accessToken);

    const vendor = await VendorFactory.create();
    const invoice = await Invoice.create({
      organizationId: admin.user.organizationId!,
      vendorId: vendor._id,
      invoiceNumber: `INV-DISPUTE-${Date.now()}`,
      amount: 75000,
      currency: "NGN",
      status: "submitted",
      submittedAt: new Date(),
    });

    const res = await adminClient.patch(`/api/v1/invoices/${invoice._id}/dispute`).send({ reason: "Overcharged by 30%" });
    expect(res.status).toBe(200);

    const updated = await Invoice.findById(invoice._id);
    expect(updated!.status).toBe("disputed");
    expect(updated!.disputeReason).toBe("Overcharged by 30%");
    expect(updated!.disputedAt).toBeDefined();
    expect(updated!.disputedBy?.toString()).toBe(admin.user._id.toString());
  });
});
