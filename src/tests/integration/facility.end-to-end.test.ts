import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { AppContainer } from "@/container/app.container.js";
import { loginAsOrganizationAdmin } from "../helpers/auth.js";

let container: AppContainer;
let server: import("http").Server | undefined;

beforeAll(async () => {
  container = new AppContainer();
  await container.init();
  const app = (await import("../../app.js")).default;
  server = await container.startServer(0, app);
});

afterAll(async () => {
  await container.shutdown();
  if (server && typeof server.close === "function") server.close();
});

describe("Facility end-to-end", () => {
  it("health endpoint works", async () => {
    const res = await request(server as never).get("/api/v1/health");
    expect(res.status).toBe(200);
  });

  it("creates a facility when subscription is active", async () => {
    const auth = await loginAsOrganizationAdmin({}, container);
    const subscription = await request(server as never)
      .post("/api/v1/billing/subscription")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({ plan: "professional", billingCycle: "monthly", provider: "mock" });
    expect(subscription.status).toBe(201);

    const created = await request(server as never)
      .post("/api/v1/facilities")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({
        organizationId: auth.user.organizationId?.toString(),
        name: "Integration Facility",
        address: { street: "123 Test Street", city: "Test City", state: "CA", postalCode: "90210", country: "US" },
        latitude: 34.05,
        longitude: -118.25,
      });
    expect(created.status).toBe(201);
    expect(created.body.data?.name ?? created.body.name).toBe("Integration Facility");
  });
});
