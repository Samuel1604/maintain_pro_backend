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

const PAYSTACK_API_BASE = "https://api.paystack.co";

export interface PaystackProviderOptions {
  secretKey?: string;
}

export class PaystackProvider implements PaymentProviderGateway {
  public readonly providerName = "paystack" as const;
  private readonly secretKey: string;

  constructor(options: PaystackProviderOptions = {}) {
    const secretKey = options.secretKey || process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new PaymentProviderConfigurationError(
        "PAYSTACK_SECRET_KEY is not configured in environment variables.",
      );
    }

    this.secretKey = secretKey;
  }

  async initiateCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    try {
      const response = await axios.post<{
        data: { reference: string; authorization_url: string };
      }>(
        `${PAYSTACK_API_BASE}/transaction/initialize`,
        {
          amount: params.amount ?? 0,
          currency: params.currency || "NGN",
          reference: params.idempotencyKey,
          callback_url: params.successUrl,
          metadata: { paymentId: params.paymentId, plan: params.plan },
        },
        { headers: { Authorization: `Bearer ${this.secretKey}` } },
      );

      return {
        providerCheckoutId: response.data.data.reference,
        redirectUrl: response.data.data.authorization_url,
      };
    } catch (error) {
      throw new PaymentProviderError("Paystack transaction initialization failed.", error);
    }
  }

  async verifyCheckout(providerCheckoutId: string): Promise<VerifyResult> {
    try {
      const response = await axios.get<{
        data: { status: string; id: number };
      }>(`${PAYSTACK_API_BASE}/transaction/verify/${providerCheckoutId}`, {
        headers: { Authorization: `Bearer ${this.secretKey}` },
      });

      const success = response.data.data.status === "success";

      return {
        success,
        providerReference: success ? String(response.data.data.id) : undefined,
        failureReason: success ? undefined : response.data.data.status,
      };
    } catch (error) {
      throw new PaymentProviderError("Paystack transaction verification failed.", error);
    }
  }

  parseWebhookEvent(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): PaymentWebhookEvent {
    if (!signatureHeader) {
      throw new PaymentProviderError("Missing x-paystack-signature header.");
    }

    const expected = crypto
      .createHmac("sha512", this.secretKey)
      .update(rawBody)
      .digest("hex");

    const signatureBuffer = Buffer.from(signatureHeader);
    const expectedBuffer = Buffer.from(expected);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new PaymentProviderError("Invalid Paystack webhook signature.");
    }

    const event = JSON.parse(rawBody.toString("utf8")) as {
      event: string;
      data: { reference: string; id: number };
    };

    if (event.event === "charge.success") {
      return {
        providerCheckoutId: event.data.reference,
        outcome: "succeeded",
        providerReference: String(event.data.id),
      };
    }

    return {
      providerCheckoutId: event.data.reference,
      outcome: "failed",
      failureReason: event.event,
    };
  }
}
