import { describe, it, expect } from "vitest";
import request from "supertest";
import { createTestApp } from "@/tests/helpers/app.js";
import {
  loginAsOrganizationAdmin,
  createAuthenticatedUser,
} from "@/tests/helpers/auth.js";
import { UserFactory } from "@/tests/factories/user.factory.js";
import { OrganizationFactory } from "@/tests/factories/organization.factory.js";
import { ROLES } from "@/shared/constants/roles.js";
import { Types } from "mongoose";

describe("GET /api/v1/organizations/me", () => {
  it("returns the caller's own organization, mapped to a plain profile (no Mongoose internals)", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    const res = await request(app)
      .get("/api/v1/organizations/me")
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: "active",
    });
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data._id).toBeUndefined();
    expect(res.body.data.__v).toBeUndefined();

    // Billing decoupling: no plan/subscription data ever leaves this
    // endpoint, because Organization no longer stores any.
    expect(res.body.data.plan).toBeUndefined();
    expect(res.body.data.subscriptionStatus).toBeUndefined();
  });

  it("rejects an unauthenticated request", async () => {
    const app = await createTestApp();

    const res = await request(app).get("/api/v1/organizations/me");

    expect(res.status).toBe(401);
  });

  it("never leaks another organization's profile, regardless of role", async () => {
    const app = await createTestApp();
    const otherOrg = await OrganizationFactory.create({
      name: "Someone Else's Org",
    });

    // A staff member of a *different* organization than otherOrg.
    const { accessToken } = await createAuthenticatedUser({
      role: ROLES.STAFF,
    });

    const res = await request(app)
      .get("/api/v1/organizations/me")
      .set("Cookie", [`accessToken=${accessToken}`]);


    // There is no route parameter to smuggle another org's id through —
    // the endpoint only ever resolves the organization from the caller's
    // own JWT — so this must return the caller's own org, never otherOrg.
    expect(res.status).toBe(200);
    expect(res.body.data.name).not.toBe(otherOrg.name);
  });
});

describe("PATCH /api/v1/organizations/me", () => {
  it("lets a verified admin update their own organization's profile", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    const res = await request(app)
      .patch("/api/v1/organizations/me")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ name: "Renamed Facilities Co", phone: "+15551234567" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Renamed Facilities Co");
    expect(res.body.data.phone).toBe("+15551234567");
  });

  it("rejects updates from non-admin roles", async () => {
    const app = await createTestApp();
    const { user, rawPassword } = await UserFactory.createVerifiedOrganizationAdmin();
    const org = user.organizationId!.toString();

    const { accessToken } = await createAuthenticatedUser({
      role: ROLES.STAFF,
      organizationId: new Types.ObjectId(org),
      email: `staff-for-${rawPassword.length}-${Date.now()}@test.com`,
    });

    const res = await request(app)
      .patch("/api/v1/organizations/me")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ name: "Should Not Apply" });

    expect(res.status).toBe(403);
  });

  it("rejects an empty update body", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    const res = await request(app)
      .patch("/api/v1/organizations/me")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({});

    expect(res.status).toBe(400);
  });

  it("rejects status and plan as update fields — those aren't self-service", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    const res = await request(app)
      .patch("/api/v1/organizations/me")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ status: "suspended", plan: "enterprise" });

    // Unknown/disallowed fields are simply not part of the schema, so
    // this becomes an empty effective update and is rejected as such —
    // it must NOT silently apply a status or plan change.
    expect(res.status).toBe(400);
  });
});
