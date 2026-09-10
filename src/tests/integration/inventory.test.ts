import { describe, expect, it } from "vitest";
import request from "supertest";
import { Types } from "mongoose";
import { createTestApp } from "@/tests/helpers/app.js";
import { loginAsOrganizationAdmin } from "@/tests/helpers/auth.js";

function accessCookie(token: string) { return [`accessToken=${token}`]; }

async function csrf(app: Awaited<ReturnType<typeof createTestApp>>, token: string) {
  const health = await request(app).get("/api/v1/health");
  const raw = health.headers["set-cookie"];
  const cookies = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  const header = cookies.find((value: string) => value.startsWith("csrfToken="))?.match(/csrfToken=([^;]+)/)?.[1];
  if (!header) throw new Error("CSRF cookie not issued");
  return request.agent(app).set("Cookie", [...accessCookie(token), `csrfToken=${header}`]).set("X-CSRF-Token", header);
}

describe("Inventory domain", () => {
  it("receives, reserves, consumes and returns stock through explicit transactions", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();
    const client = await csrf(app, accessToken);
    const item = await client.post("/api/v1/inventory/items").send({ sku: "FILTER-001", name: "HVAC Filter", unitOfMeasure: "piece", reorderLevel: 2 });
    expect(item.status).toBe(201);
    const location = await client.post("/api/v1/inventory/locations").send({ name: "Central Store", code: "CENTRAL" });
    expect(location.status).toBe(201);
    const itemId = item.body.data.id;
    const locationId = location.body.data.id;
    expect((await client.post("/api/v1/inventory/transactions/receive").send({ itemId, stockLocationId: locationId, quantity: 10 })).status).toBe(201);
    const reservation = await client.post("/api/v1/inventory/transactions/reserve").send({ itemId, stockLocationId: locationId, quantity: 4 });
    expect(reservation.status).toBe(201);
    const issued = await client.post("/api/v1/inventory/transactions/consume").send({ itemId, stockLocationId: locationId, quantity: 3, reservationId: reservation.body.data.id });
    expect(issued.status).toBe(201);
    const history = await client.get(`/api/v1/inventory/history?itemId=${itemId}`);
    expect(history.status).toBe(200);
    expect(history.body.data.map((entry: { type: string }) => entry.type)).toEqual(expect.arrayContaining(["receipt", "reservation", "consumption"]));
    const balance = await client.get(`/api/v1/inventory/balances?itemId=${itemId}&stockLocationId=${locationId}`);
    expect(balance.body.data[0]).toMatchObject({ quantity: 7, reservedQuantity: 1, availableQuantity: 6 });
    const issue = await client.post("/api/v1/inventory/transactions/issue").send({ itemId, stockLocationId: locationId, quantity: 2 });
    expect(issue.status).toBe(201);
    const returned = await client.post("/api/v1/inventory/transactions/return").send({ originalTransactionId: history.body.data.find((entry: { type: string }) => entry.type === "consumption").id, quantity: 1 });
    expect(returned.status).toBe(201);
  });

  it("does not allow an organization to access another organization's inventory", async () => {
    const app = await createTestApp();
    const first = await loginAsOrganizationAdmin();
    const second = await loginAsOrganizationAdmin();
    const firstClient = await csrf(app, first.accessToken);
    const created = await firstClient.post("/api/v1/inventory/items").send({ sku: `ISO-${new Types.ObjectId().toString()}`, name: "Private Part", unitOfMeasure: "piece" });
    const secondClient = await csrf(app, second.accessToken);
    const response = await secondClient.get(`/api/v1/inventory/items`);
    expect(response.status).toBe(200);
    expect(response.body.data.some((entry: { id: string }) => entry.id === created.body.data.id)).toBe(false);
  });

  it("applies one idempotent receipt when concurrent retries share a key", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();
    const client = await csrf(app, accessToken);
    const item = await client.post("/api/v1/inventory/items").send({ sku: `CONCURRENT-${new Types.ObjectId().toString()}`, name: "Concurrent Part", unitOfMeasure: "piece" });
    const location = await client.post("/api/v1/inventory/locations").send({ name: `Concurrent Store ${new Types.ObjectId().toString()}` });
    const body = { itemId: item.body.data.id, stockLocationId: location.body.data.id, quantity: 10, idempotencyKey: `receipt-${new Types.ObjectId().toString()}` };
    const responses = await Promise.all(Array.from({ length: 10 }, () => client.post("/api/v1/inventory/transactions/receive").send(body)));
    expect(responses.every((response) => response.status === 201)).toBe(true);
    const balance = await client.get(`/api/v1/inventory/balances?itemId=${body.itemId}&stockLocationId=${body.stockLocationId}`);
    expect(balance.body.data[0]).toMatchObject({ quantity: 10, availableQuantity: 10 });
    const history = await client.get(`/api/v1/inventory/history?itemId=${body.itemId}`);
    expect(history.body.data.filter((entry: { type: string }) => entry.type === "receipt")).toHaveLength(1);
  });

  it("never reserves more stock than is available under concurrent requests", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();
    const client = await csrf(app, accessToken);
    const item = await client.post("/api/v1/inventory/items").send({ sku: `RESERVE-RACE-${new Types.ObjectId().toString()}`, name: "Reserve Race Part", unitOfMeasure: "piece" });
    const location = await client.post("/api/v1/inventory/locations").send({ name: `Reserve Race Store ${new Types.ObjectId().toString()}` });
    const body = { itemId: item.body.data.id, stockLocationId: location.body.data.id, quantity: 2 };
    expect((await client.post("/api/v1/inventory/transactions/receive").send({ ...body, quantity: 10 })).status).toBe(201);

    const responses = await Promise.all(Array.from({ length: 10 }, () => client.post("/api/v1/inventory/transactions/reserve").send(body)));
    expect(responses.filter((response) => response.status === 201)).toHaveLength(5);
    expect(responses.filter((response) => response.status !== 201).every((response) => response.status === 409)).toBe(true);
    const balance = await client.get(`/api/v1/inventory/balances?itemId=${body.itemId}&stockLocationId=${body.stockLocationId}`);
    expect(balance.body.data[0]).toMatchObject({ quantity: 10, reservedQuantity: 10, availableQuantity: 0 });
  });

  it("serializes concurrent consumption against one reservation", async () => {
    const app = await createTestApp();
    const { accessToken } = await loginAsOrganizationAdmin();
    const client = await csrf(app, accessToken);
    const item = await client.post("/api/v1/inventory/items").send({ sku: `CONSUME-RACE-${new Types.ObjectId().toString()}`, name: "Consume Race Part", unitOfMeasure: "piece" });
    const location = await client.post("/api/v1/inventory/locations").send({ name: `Consume Race Store ${new Types.ObjectId().toString()}` });
    const body = { itemId: item.body.data.id, stockLocationId: location.body.data.id };
    await client.post("/api/v1/inventory/transactions/receive").send({ ...body, quantity: 10 });
    const reservation = await client.post("/api/v1/inventory/transactions/reserve").send({ ...body, quantity: 10 });
    expect(reservation.status).toBe(201);

    const responses = await Promise.all(Array.from({ length: 10 }, () => client.post("/api/v1/inventory/transactions/consume").send({ ...body, quantity: 1, reservationId: reservation.body.data.id })));
    expect(responses.every((response) => response.status === 201)).toBe(true);
    const balance = await client.get(`/api/v1/inventory/balances?itemId=${body.itemId}&stockLocationId=${body.stockLocationId}`);
    expect(balance.body.data[0]).toMatchObject({ quantity: 0, reservedQuantity: 0, availableQuantity: 0 });
    const history = await client.get(`/api/v1/inventory/history?itemId=${body.itemId}`);
    expect(history.body.data.filter((entry: { type: string }) => entry.type === "consumption")).toHaveLength(10);
  });
});
