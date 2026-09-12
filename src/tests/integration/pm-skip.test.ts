/**
 * Preventive Maintenance Skip Integration Tests
 *
 * Verifies that:
 * - Admin/Manager can skip a PM Plan
 * - The skipped occurrence is marked cancelled
 * - skipHistory is appended with correct reason/dates
 * - plannedDate is advanced to the next occurrence
 * - Next occurrence is created in scheduled state
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "@/tests/helpers/app.js";
import { loginAsOrganizationAdmin } from "@/tests/helpers/auth.js";
import { PMPlan } from "@/modules/preventive-maintenance/pm.model.js";
import { PMOccurrence } from "@/modules/preventive-maintenance/pm-occurrence.model.js";
import { Facility } from "@/modules/facilities/facility.model.js";
import { Location } from "@/modules/locations/location.model.js";
import { Asset } from "@/modules/assets/asset.model.js";
import { AssetStatus, AssetCategory } from "@/modules/assets/asset.types.js";

function accessCookie(token: string) { return [`accessToken=${token}`]; }
async function csrfAgent(app: Awaited<ReturnType<typeof createTestApp>>, token: string) {
  const health = await request(app).get("/api/v1/health");
  const raw = health.headers["set-cookie"];
  const cookies = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const csrf = cookies.find((v: string) => v.startsWith("csrfToken="))?.match(/csrfToken=([^;]+)/)?.[1];
  if (!csrf) throw new Error("CSRF cookie not issued");
  return request.agent(app).set("Cookie", [...accessCookie(token), `csrfToken=${csrf}`]).set("X-CSRF-Token", csrf);
}

describe("PM Skip Workflow", () => {
  it("allows admin to skip a PM plan occurrence", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();
    const adminClient = await csrfAgent(app, admin.accessToken);

    const facility = await Facility.create({
      organizationId: admin.user.organizationId,
      name: "PM Fac",
      address: { street: "1 St", city: "L", state: "S", country: "NG", postalCode: "000" },
      createdBy: admin.user._id,
      coordinates: { type: "Point", coordinates: [3.3792, 6.5244] },
    });
    const location = await Location.create({ organizationId: admin.user.organizationId, facilityId: facility._id, name: "PM Loc", type: "BUILDING" });
    const asset = await Asset.create({
      organizationId: admin.user.organizationId,
      facilityId: facility._id,
      locationId: location._id,
      assetTag: "AST-HVAC-001",
      name: "PM Asset",
      category: AssetCategory.HARDWARE,
      purchaseDate: new Date(),
      installationDate: new Date(),
      estimatedValue: 15000,
      status: AssetStatus.ACTIVE,
      createdBy: admin.user._id,
    });

    const startDate = new Date();
    // Round to start of hour for consistent date comparison
    startDate.setMinutes(0, 0, 0);

    const pmPlan = await PMPlan.create({
      organizationId: admin.user.organizationId!,
      facilityId: facility._id,
      locationId: location._id,
      assetId: asset._id,
      title: "Weekly HVAC Check",
      description: "Perform scheduled HVAC maintenance",
      maintenanceType: "HVAC",
      recurrence: {
        frequency: "weekly",
        interval: 1,
        startDate,
      },
      plannedDate: startDate,
      priority: "high",
      status: "approved",
      createdBy: admin.user._id,
    });

    // Create the first occurrence
    const occurrence = await PMOccurrence.create({
      organizationId: admin.user.organizationId!,
      preventiveMaintenanceId: pmPlan._id,
      facilityId: facility._id,
      locationId: location._id,
      assetId: asset._id,
      scheduledAt: startDate,
      status: "scheduled",
      approvalState: "approved",
      createdBy: admin.user._id,
    });

    const res = await adminClient.post(`/api/v1/preventive-maintenance/${pmPlan._id}/skip`).send({ reason: "Technician unavailable, reschedule" });
    expect(res.status).toBe(200);

    // Skipped occurrence should be cancelled
    const updatedOccurrence = await PMOccurrence.findById(occurrence._id);
    expect(updatedOccurrence!.status).toBe("cancelled");
    expect(updatedOccurrence!.rejectionReason).toContain("Skipped");

    // Plan should have advanced to next weekly occurrence (startDate + 7 days)
    const updatedPlan = await PMPlan.findById(pmPlan._id);
    const startUtc = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const expectedNextDate = new Date(startUtc.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(updatedPlan!.plannedDate.getTime()).toBe(expectedNextDate.getTime());

    // Skip history should be recorded
    expect(updatedPlan!.skipHistory).toBeDefined();
    expect(updatedPlan!.skipHistory).toHaveLength(1);
    expect(updatedPlan!.skipHistory![0]!.reason).toBe("Technician unavailable, reschedule");
    expect(updatedPlan!.skipHistory![0]!.originalDueDate.getTime()).toBe(startDate.getTime());

    // Next occurrence should be auto-created
    const nextOccurrence = await PMOccurrence.findOne({
      preventiveMaintenanceId: pmPlan._id,
      scheduledAt: expectedNextDate,
    });
    expect(nextOccurrence).toBeDefined();
    expect(nextOccurrence!.status).toBe("generated"); // since plan is approved, it should be approved & work-order generated
  });
});
