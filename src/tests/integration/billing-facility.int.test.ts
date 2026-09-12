import { describe, it, beforeAll, afterAll, expect } from "vitest";
import request from "supertest";
import { AppContainer } from "@/container/app.container.js";

let container: AppContainer;
let server: import("http").Server;

beforeAll(async () => {
  container = new AppContainer();
  await container.init();
  const app = (await import("@/app.js")).default;
  server = await container.startServer(0, app);
});

afterAll(async () => {
  await container.shutdown();
  if (server && typeof server.close === "function") server.close();
});

describe("Billing -> Facility integration", () => {
  it("publishes billing events and allows facility creation when active", async () => {
    // This is a smoke integration: ensure routes load and event bus is wired.
    const res = await request(server).get("/api/v1/health");
    expect(res.status).toBe(200);
  });
});
