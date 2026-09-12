import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { PaystackProvider } from "@/modules/billing/providers/paystack.provider.js";
import { StripeProvider } from "@/modules/billing/providers/stripe.provider.js";
import { FlutterwaveProvider } from "@/modules/billing/providers/flutterwave.provider.js";

const PAYSTACK_SECRET = "paystack-test-secret";
const STRIPE_SECRET = "stripe-test-secret";
const FLUTTERWAVE_HASH = "flutterwave-test-hash";

function hmac(algorithm: "sha256" | "sha512", secret: string, payload: Buffer): string {
  return crypto.createHmac(algorithm, secret).update(payload).digest("hex");
}

describe("sandbox payment webhook fixtures", () => {
  it("accepts a signed Paystack charge.success payload", () => {
    const provider = new PaystackProvider({ secretKey: PAYSTACK_SECRET });
    const payload = Buffer.from(JSON.stringify({
      event: "charge.success",
      data: { reference: "paystack_ref_123", id: 99123 },
    }));

    const event = provider.parseWebhookEvent(payload, hmac("sha512", PAYSTACK_SECRET, payload));

    expect(event).toEqual({
      providerCheckoutId: "paystack_ref_123",
      outcome: "succeeded",
      providerReference: "99123",
    });
  });

  it("rejects a tampered Paystack payload", () => {
    const provider = new PaystackProvider({ secretKey: PAYSTACK_SECRET });
    const payload = Buffer.from(JSON.stringify({
      event: "charge.success",
      data: { reference: "paystack_ref_123", id: 99123 },
    }));

    expect(() => provider.parseWebhookEvent(payload, "0".repeat(128))).toThrow(
      "Invalid Paystack webhook signature.",
    );
  });

  it("accepts a signed Stripe checkout.session.completed payload", () => {
    const provider = new StripeProvider({
      secretKey: "sk_test_fixture",
      webhookSecret: STRIPE_SECRET,
    });
    const payload = Buffer.from(JSON.stringify({
      id: "evt_fixture_123",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", payment_intent: "pi_test_123" } },
    }));
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = hmac("sha256", STRIPE_SECRET, Buffer.from(`${timestamp}.${payload.toString("utf8")}`));

    const event = provider.parseWebhookEvent(payload, `t=${timestamp},v1=${signature}`);

    expect(event).toEqual({
      providerCheckoutId: "cs_test_123",
      outcome: "succeeded",
      providerReference: "pi_test_123",
    });
  });

  it("rejects an expired Stripe signature", () => {
    const provider = new StripeProvider({
      secretKey: "sk_test_fixture",
      webhookSecret: STRIPE_SECRET,
    });
    const payload = Buffer.from(JSON.stringify({
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123" } },
    }));
    const timestamp = Math.floor(Date.now() / 1000) - 301;
    const signature = hmac("sha256", STRIPE_SECRET, Buffer.from(`${timestamp}.${payload.toString("utf8")}`));

    expect(() => provider.parseWebhookEvent(payload, `t=${timestamp},v1=${signature}`)).toThrow(
      "Stripe webhook timestamp outside tolerance.",
    );
  });

  it("accepts Flutterwave's signed shared-secret payload", () => {
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-fixture",
      webhookSecretHash: FLUTTERWAVE_HASH,
    });
    const payload = Buffer.from(JSON.stringify({
      event: "charge.completed",
      data: { status: "successful", id: 777, tx_ref: "flw_ref_777" },
    }));

    const event = provider.parseWebhookEvent(payload, FLUTTERWAVE_HASH);

    expect(event).toEqual({
      providerCheckoutId: "flw_ref_777",
      outcome: "succeeded",
      providerReference: "777",
    });
  });

  it("rejects a malformed Flutterwave signature", () => {
    const provider = new FlutterwaveProvider({
      secretKey: "FLWSECK_TEST-fixture",
      webhookSecretHash: FLUTTERWAVE_HASH,
    });
    const payload = Buffer.from(JSON.stringify({
      event: "charge.completed",
      data: { status: "successful", id: 777, tx_ref: "flw_ref_777" },
    }));

    expect(() => provider.parseWebhookEvent(payload, "wrong-hash")).toThrow(
      "Invalid Flutterwave verif-hash header.",
    );
  });
});
