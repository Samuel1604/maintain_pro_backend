import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { createTestApp, teardownTestApp } from "../helpers/test-app.js";
import type { AppContainer } from "@/container/app.container.js";
import { loginAsOrganizationAdmin } from "../helpers/auth.js";

let container: AppContainer;
let server: import("http").Server | undefined;

beforeAll(async () => {
  const res = await createTestApp();
  container = res.container;
  server = res.server;
});

afterAll(async () => {
  await teardownTestApp(container, server);
});

describe("Billing end-to-end", () => {
  it("health endpoint works", async () => {
    const res = await request(server as never).get("/api/v1/health");
    expect(res.status).toBe(200);
  });

  it("creates and retrieves an organization subscription", async () => {
    const auth = await loginAsOrganizationAdmin({}, container);
    const created = await request(server as never)
      .post("/api/v1/billing/subscription")
      .set("Authorization", `Bearer ${auth.accessToken}`)
      .send({ plan: "professional", billingCycle: "monthly", provider: "mock" });
    expect(created.status).toBe(201);
    expect(created.body.data?.plan ?? created.body.plan).toBe("professional");

    const retrieved = await request(server as never)
      .get("/api/v1/billing/subscription")
      .set("Authorization", `Bearer ${auth.accessToken}`);
    expect(retrieved.status).toBe(200);
    expect(retrieved.body.data?.plan ?? retrieved.body.plan).toBe("professional");
  });
});
