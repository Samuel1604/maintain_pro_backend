import { describe, expect, it } from "vitest";
import { completionInvoiceSchema, vendorAcceptSchema, vendorRejectSchema } from "@/modules/work-orders/work-order.schema.js";

describe("vendor workflow schemas", () => {
  it("accepts an optional proposed schedule", () => {
    const result = vendorAcceptSchema.parse({ proposedSchedule: "2026-08-27T10:00:00.000Z" });
    expect(result.proposedSchedule).toBeInstanceOf(Date);
  });

  it("requires a meaningful rejection reason", () => {
    expect(() => vendorRejectSchema.parse({ reason: "no" })).toThrow();
    expect(vendorRejectSchema.parse({ reason: "Capacity unavailable" }).reason).toBe("Capacity unavailable");
  });

  it("validates invoice amount and three-letter currency", () => {
    expect(completionInvoiceSchema.parse({ invoiceNumber: "INV-1", amount: 0, currency: "NGN" }).amount).toBe(0);
    expect(() => completionInvoiceSchema.parse({ invoiceNumber: "INV-1", amount: -1 })).toThrow();
    expect(() => completionInvoiceSchema.parse({ invoiceNumber: "INV-1", amount: 10, currency: "N" })).toThrow();
  });
});
