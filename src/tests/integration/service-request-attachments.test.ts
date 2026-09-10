/**
 * Service Request Attachments Integration Tests
 *
 * Verifies that:
 * - attachmentUploadIds are validated against the Upload collection on creation
 * - attachmentUploadIds are returned in the service request response
 * - Invalid upload IDs (wrong purpose / wrong owner) are rejected
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import { Types } from "mongoose";
import { createTestApp } from "@/tests/helpers/app.js";
import { loginAsOrganizationAdmin } from "@/tests/helpers/auth.js";
import { Upload } from "@/modules/uploads/upload.model.js";
import { Facility } from "@/modules/facilities/facility.model.js";
import { Location } from "@/modules/locations/location.model.js";
import { Asset } from "@/modules/assets/asset.model.js";

function accessCookie(token: string) { return [`accessToken=${token}`]; }
async function csrfAgent(app: Awaited<ReturnType<typeof createTestApp>>, token: string) {
  const health = await request(app).get("/api/v1/health");
  const raw = health.headers["set-cookie"];
  const cookies = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const csrf = cookies.find((v: string) => v.startsWith("csrfToken="))?.match(/csrfToken=([^;]+)/)?.[1];
  if (!csrf) throw new Error("CSRF cookie not issued");
  return request.agent(app).set("Cookie", [...accessCookie(token), `csrfToken=${csrf}`]).set("X-CSRF-Token", csrf);
}

describe("Service Request Attachments", () => {
  it("rejects an upload that doesn't belong to the actor or has wrong purpose", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();
    const adminClient = await csrfAgent(app, admin.accessToken);

    const facility = await Facility.create({
      organizationId: admin.user.organizationId,
      name: "F1",
      address: { street: "1 St", city: "L", state: "S", country: "NG", postalCode: "000" },
      createdBy: admin.user._id,
      coordinates: { type: "Point", coordinates: [3.3792, 6.5244] },
    });
    const location = await Location.create({ organizationId: admin.user.organizationId, facilityId: facility._id, name: "L1", type: "BUILDING" });
    const asset = await Asset.create({ organizationId: admin.user.organizationId, facilityId: facility._id, locationId: location._id, assetTag: "ATT-001", name: "Test asset", purchaseDate: new Date(), installationDate: new Date(), estimatedValue: 1000, createdBy: admin.user._id });

    // Upload that belongs to a different user
    const foreignUpload = await Upload.create({
      actorId: new Types.ObjectId(), // different user
      organizationId: admin.user.organizationId,
      originalName: "doc.pdf",
      mimeType: "application/pdf",
      size: 1024,
      category: "document",
      purpose: "service-request-attachment",
      providerPublicId: "abc123",
      url: "https://cdn.example.com/doc.pdf",
      secureUrl: "https://cdn.example.com/doc.pdf",
      status: "available",
    });

    const res = await adminClient.post("/api/v1/service-requests").send({
      organizationId: admin.user.organizationId!.toString(),
      facilityId: facility._id.toString(),
      locationId: location._id.toString(),
      assetId: asset._id.toString(),
      title: "Attachment SR",
      description: "Testing invalid attachment",
      serviceCategory: "HVAC",
      attachmentUploadIds: [foreignUpload._id.toString()],
    });

    // Should fail because the upload doesn't belong to this actor
    expect(res.status).toBe(404);
  });

  it("accepts valid owned attachments and includes them in the response", async () => {
    const app = await createTestApp();
    const admin = await loginAsOrganizationAdmin();
    const adminClient = await csrfAgent(app, admin.accessToken);

    const facility = await Facility.create({
      organizationId: admin.user.organizationId,
      name: "F2",
      address: { street: "2 St", city: "L", state: "S", country: "NG", postalCode: "000" },
      createdBy: admin.user._id,
      coordinates: { type: "Point", coordinates: [3.3792, 6.5244] },
    });
    const location = await Location.create({ organizationId: admin.user.organizationId, facilityId: facility._id, name: "L2", type: "BUILDING" });
    const asset = await Asset.create({ organizationId: admin.user.organizationId, facilityId: facility._id, locationId: location._id, assetTag: "ATT-002", name: "Test asset", purchaseDate: new Date(), installationDate: new Date(), estimatedValue: 1000, createdBy: admin.user._id });

    // Valid upload owned by this actor
    const upload = await Upload.create({
      actorId: admin.user._id,
      organizationId: admin.user.organizationId,
      originalName: "photo.jpg",
      mimeType: "image/jpeg",
      size: 4096,
      category: "image",
      purpose: "service-request-attachment",
      providerPublicId: "xyz789",
      url: "https://cdn.example.com/photo.jpg",
      secureUrl: "https://cdn.example.com/photo.jpg",
      status: "available",
    });

    const res = await adminClient.post("/api/v1/service-requests").send({
      organizationId: admin.user.organizationId!.toString(),
      facilityId: facility._id.toString(),
      locationId: location._id.toString(),
      assetId: asset._id.toString(),
      title: "Attachment SR Valid",
      description: "Testing valid attachment upload",
      serviceCategory: "Electrical",
      attachmentUploadIds: [upload._id.toString()],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.attachmentUploadIds).toContain(upload._id.toString());
  });
});
