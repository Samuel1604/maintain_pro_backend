import { describe, it, expect } from "vitest";
import request from "supertest";
import { createTestApp } from "@/tests/helpers/app.js";
import { loginAsOrganizationAdmin, loginAsVendorLead, createAuthenticatedUser } from "@/tests/helpers/auth.js";
import { ROLES } from "@/shared/constants/roles.js";
import { MockPaymentProvider } from "@/modules/billing/providers/mock.provider.js";

describe("POST /api/v1/billing/subscription", () => {
  it("creates a trial subscription for the caller's own organization", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    const res = await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      plan: "starter",
      status: "trial",
      ownerType: "organization",
    });
  });

  it("creates a trial subscription for the caller's own vendor", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsVendorLead();

    const res = await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "free" });

    expect(res.status).toBe(201);
    expect(res.body.data.ownerType).toBe("vendor");
  });

  it("rejects a second subscription for the same owner", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    const res = await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "professional" });

    expect(res.status).toBe(409);
  });

  it("rejects non-owner roles from creating a subscription", async () => {
    const app = await createTestApp();
    const { user } = await loginAsOrganizationAdmin();
    const { accessToken } = await createAuthenticatedUser({
      role: ROLES.STAFF,
      organizationId: user.organizationId,
    });

    const res = await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    expect(res.status).toBe(403);
  });

  it("never accepts an ownerId/ownerType from the client — always the caller's own", async () => {
    const app = await createTestApp();
    const orgA = await loginAsOrganizationAdmin();
    const orgB = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${orgB.accessToken}`])
      .send({ plan: "professional" });

    // Even if a client tries to smuggle another owner's id in, there is
    // no field for it in the schema — it's simply ignored/stripped.
    const res = await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${orgA.accessToken}`])
      .send({
        plan: "starter",
        ownerId: orgB.user.organizationId,
        ownerType: "organization",
      });

    expect(res.status).toBe(201);
    // orgA still got its OWN subscription, not a duplicate/hijack of orgB's.
    const mine = await request(app)
      .get("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${orgA.accessToken}`]);
    expect(mine.body.data.plan).toBe("starter");
  });
});

describe("GET /api/v1/billing/subscription", () => {
  it("returns an empty successful response when the caller's organization has no subscription yet", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    const res = await request(app)
      .get("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("never returns another tenant's subscription", async () => {
    const app = await createTestApp();
    const orgA = await loginAsOrganizationAdmin();
    const orgB = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${orgB.accessToken}`])
      .send({ plan: "enterprise" });

    // orgA has no subscription of its own — it must get an empty response, never
    // orgB's, no matter what.
    const res = await request(app)
      .get("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${orgA.accessToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

describe("checkout → webhook activation", () => {
  it("does not activate the subscription merely on checkout initiation", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    const checkout = await request(app)
      .post("/api/v1/billing/subscription/checkout")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ provider: "mock" });

    expect(checkout.status).toBe(200);
    expect(checkout.body.data.status).toBe("pending");

    const stillTrial = await request(app)
      .get("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(stillTrial.body.data.status).toBe("trial");
  });

  it("activates the subscription only after a verified webhook confirms payment", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    const checkout = await request(app)
      .post("/api/v1/billing/subscription/checkout")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ provider: "mock" });

    const providerCheckoutId = `mock_checkout_${checkout.body.data.paymentId}`;
    const mockProvider = new MockPaymentProvider();
    const payload = Buffer.from(
      JSON.stringify({ providerCheckoutId, outcome: "succeeded" }),
    );
    const signature = mockProvider.sign(payload);

    const webhook = await request(app)
      .post("/api/v1/billing/webhooks/mock")
      .set("x-mock-signature", signature)
      .set("Content-Type", "application/json")
      .send(payload);

    expect(webhook.status).toBe(200);

    const activated = await request(app)
      .get("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(activated.body.data.status).toBe("active");
    expect(activated.body.data.plan).toBe("starter");
  });

  it("rejects a webhook with an invalid signature", async () => {
    const app = await createTestApp();

    const res = await request(app)
      .post("/api/v1/billing/webhooks/mock")
      .set("x-mock-signature", "not-the-real-signature")
      .set("Content-Type", "application/json")
      .send(Buffer.from(JSON.stringify({ providerCheckoutId: "whatever", outcome: "succeeded" })));

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("drops an active subscription to past_due on a failed renewal payment", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    const initialCheckout = await request(app)
      .post("/api/v1/billing/subscription/checkout")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ provider: "mock" });

    const mockProvider = new MockPaymentProvider();

    const activatePayload = Buffer.from(
      JSON.stringify({
        providerCheckoutId: `mock_checkout_${initialCheckout.body.data.paymentId}`,
        outcome: "succeeded",
      }),
    );
    await request(app)
      .post("/api/v1/billing/webhooks/mock")
      .set("x-mock-signature", mockProvider.sign(activatePayload))
      .set("Content-Type", "application/json")
      .send(activatePayload);

    // Now active — simulate a renewal checkout that fails.
    const renewalCheckout = await request(app)
      .post("/api/v1/billing/subscription/checkout")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ provider: "mock" });

    const failPayload = Buffer.from(
      JSON.stringify({
        providerCheckoutId: `mock_checkout_${renewalCheckout.body.data.paymentId}`,
        outcome: "failed",
        failureReason: "card_declined",
      }),
    );
    await request(app)
      .post("/api/v1/billing/webhooks/mock")
      .set("x-mock-signature", mockProvider.sign(failPayload))
      .set("Content-Type", "application/json")
      .send(failPayload);

    const res = await request(app)
      .get("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(res.body.data.status).toBe("past_due");
  });
});

describe("idempotency", () => {
  it("reuses the in-flight checkout instead of creating a duplicate", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    const first = await request(app)
      .post("/api/v1/billing/subscription/checkout")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ provider: "mock" });

    const second = await request(app)
      .post("/api/v1/billing/subscription/checkout")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ provider: "mock" });

    expect(second.body.data.paymentId).toBe(first.body.data.paymentId);
  });

  it("does not re-apply a redelivered webhook event", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    const checkout = await request(app)
      .post("/api/v1/billing/subscription/checkout")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ provider: "mock" });

    const mockProvider = new MockPaymentProvider();
    const payload = Buffer.from(
      JSON.stringify({
        providerCheckoutId: `mock_checkout_${checkout.body.data.paymentId}`,
        outcome: "succeeded",
      }),
    );
    const signature = mockProvider.sign(payload);

    const firstDelivery = await request(app)
      .post("/api/v1/billing/webhooks/mock")
      .set("x-mock-signature", signature)
      .set("Content-Type", "application/json")
      .send(payload);

    expect(firstDelivery.status).toBe(200);

    // Same provider event, redelivered — providers do this routinely
    // until they receive a 2xx. Must not error and must not re-apply
    // the transition a second time.
    const redelivery = await request(app)
      .post("/api/v1/billing/webhooks/mock")
      .set("x-mock-signature", signature)
      .set("Content-Type", "application/json")
      .send(payload);

    expect(redelivery.status).toBe(200);

    const res = await request(app)
      .get("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(res.body.data.status).toBe("active");
    expect(res.body.data.plan).toBe("starter");
  });
});

describe("cancellation and plan changes", () => {
  it("cancels the caller's own subscription", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    const res = await request(app)
      .post("/api/v1/billing/subscription/cancel")
      .set("Cookie", [`accessToken=${accessToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
  });

  it("rejects a downgrade to the same plan", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    const res = await request(app)
      .patch("/api/v1/billing/subscription/downgrade")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "starter" });

    expect(res.status).toBe(409);
  });

  it("rejects an upgrade to a lower tier", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();

    await request(app)
      .post("/api/v1/billing/subscription")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "professional" });

    const res = await request(app)
      .patch("/api/v1/billing/subscription/upgrade")
      .set("Cookie", [`accessToken=${accessToken}`])
      .send({ plan: "free" });

    expect(res.status).toBe(422);
  });
});
