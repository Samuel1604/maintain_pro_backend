import crypto from "crypto";
import axios from "axios";
import type {
  CheckoutParams,
  CheckoutResult,
  PaymentProviderGateway,
  PaymentWebhookEvent,
  VerifyResult,
} from "./payment-provider.interface.js";
import {
  PaymentProviderConfigurationError,
  PaymentProviderError,
} from "../exceptions/billing.exceptions.js";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

// Stripe tolerates clock drift between the event timestamp and receipt
// time; this is their own documented default tolerance.
const WEBHOOK_TOLERANCE_SECONDS = 300;

export interface StripeProviderOptions {
  secretKey?: string;
  webhookSecret?: string;
}

export class StripeProvider implements PaymentProviderGateway {
  public readonly providerName = "stripe" as const;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(options: StripeProviderOptions = {}) {
    const secretKey = options.secretKey || process.env.STRIPE_SECRET_KEY;
    const webhookSecret = options.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) {
      throw new PaymentProviderConfigurationError(
        "STRIPE_SECRET_KEY is not configured in environment variables.",
      );
    }

    if (!webhookSecret) {
      throw new PaymentProviderConfigurationError(
        "STRIPE_WEBHOOK_SECRET is not configured in environment variables.",
      );
    }

    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
  }

  async initiateCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    try {
      const body = new URLSearchParams({
        mode: "subscription",
        "line_items[0][price_data][currency]": params.currency || "usd",
        "line_items[0][price_data][product_data][name]": `MaintainPro ${params.plan} plan`,
        "line_items[0][price_data][unit_amount]": String(params.amount ?? 0),
        "line_items[0][quantity]": "1",
        success_url: params.successUrl || "https://maintainpro.com/billing/success",
        cancel_url: params.cancelUrl || "https://maintainpro.com/billing/cancel",
        client_reference_id: params.paymentId,
      });

      const response = await axios.post<{ id: string; url: string }>(
        `${STRIPE_API_BASE}/checkout/sessions`,
        body,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Idempotency-Key": params.idempotencyKey,
          },
        },
      );

      return {
        providerCheckoutId: response.data.id,
        redirectUrl: response.data.url,
      };
    } catch (error) {
      throw new PaymentProviderError("Stripe checkout session creation failed.", error);
    }
  }

  async verifyCheckout(providerCheckoutId: string): Promise<VerifyResult> {
    try {
      const response = await axios.get<{
        payment_status: string;
        payment_intent?: string;
      }>(`${STRIPE_API_BASE}/checkout/sessions/${providerCheckoutId}`, {
        headers: { Authorization: `Bearer ${this.secretKey}` },
      });

      const success = response.data.payment_status === "paid";

      return {
        success,
        providerReference: success ? response.data.payment_intent : undefined,
        failureReason: success ? undefined : response.data.payment_status,
      };
    } catch (error) {
      throw new PaymentProviderError("Stripe checkout verification failed.", error);
    }
  }

  parseWebhookEvent(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): PaymentWebhookEvent {
    if (!signatureHeader) {
      throw new PaymentProviderError("Missing Stripe-Signature header.");
    }

    const parts = Object.fromEntries(
      signatureHeader.split(",").map((part) => part.split("=") as [string, string]),
    );

    const timestamp = parts.t;
    const signature = parts.v1;

    if (!timestamp || !signature) {
      throw new PaymentProviderError("Malformed Stripe-Signature header.");
    }

    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));

    if (ageSeconds > WEBHOOK_TOLERANCE_SECONDS) {
      throw new PaymentProviderError("Stripe webhook timestamp outside tolerance.");
    }

    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(`${timestamp}.${rawBody.toString("utf8")}`)
      .digest("hex");

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new PaymentProviderError("Invalid Stripe webhook signature.");
    }

    const event = JSON.parse(rawBody.toString("utf8")) as {
      type: string;
      data: { object: { id: string; payment_intent?: string } };
    };

    if (event.type === "checkout.session.completed") {
      return {
        providerCheckoutId: event.data.object.id,
        outcome: "succeeded",
        providerReference: event.data.object.payment_intent,
      };
    }

    return {
      providerCheckoutId: event.data.object.id,
      outcome: "failed",
      failureReason: event.type,
    };
  }
}
