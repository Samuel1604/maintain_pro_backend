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

const FLUTTERWAVE_API_BASE = "https://api.flutterwave.com/v3";

export interface FlutterwaveProviderOptions {
  secretKey?: string;
  webhookSecretHash?: string;
}

export class FlutterwaveProvider implements PaymentProviderGateway {
  public readonly providerName = "flutterwave" as const;
  private readonly secretKey: string;
  private readonly webhookSecretHash: string;

  constructor(options: FlutterwaveProviderOptions = {}) {
    const secretKey = options.secretKey || process.env.FLUTTERWAVE_SECRET_KEY;
    const webhookSecretHash =
      options.webhookSecretHash || process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH;

    if (!secretKey) {
      throw new PaymentProviderConfigurationError(
        "FLUTTERWAVE_SECRET_KEY is not configured in environment variables.",
      );
    }

    if (!webhookSecretHash) {
      throw new PaymentProviderConfigurationError(
        "FLUTTERWAVE_WEBHOOK_SECRET_HASH is not configured in environment variables.",
      );
    }

    this.secretKey = secretKey;
    this.webhookSecretHash = webhookSecretHash;
  }

  async initiateCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    try {
      const response = await axios.post<{ data: { link: string } }>(
        `${FLUTTERWAVE_API_BASE}/payments`,
        {
          tx_ref: params.idempotencyKey,
          amount: params.amount ?? 0,
          currency: params.currency || "NGN",
          redirect_url: params.successUrl,
          meta: { paymentId: params.paymentId, plan: params.plan },
        },
        { headers: { Authorization: `Bearer ${this.secretKey}` } },
      );

      return {
        providerCheckoutId: params.idempotencyKey,
        redirectUrl: response.data.data.link,
      };
    } catch (error) {
      throw new PaymentProviderError("Flutterwave payment link creation failed.", error);
    }
  }

  async verifyCheckout(providerCheckoutId: string): Promise<VerifyResult> {
    try {
      const response = await axios.get<{
        data: { status: string; id: number; tx_ref: string };
      }>(`${FLUTTERWAVE_API_BASE}/transactions/verify_by_reference`, {
        headers: { Authorization: `Bearer ${this.secretKey}` },
        params: { tx_ref: providerCheckoutId },
      });

      const success = response.data.data.status === "successful";

      return {
        success,
        providerReference: success ? String(response.data.data.id) : undefined,
        failureReason: success ? undefined : response.data.data.status,
      };
    } catch (error) {
      throw new PaymentProviderError("Flutterwave transaction verification failed.", error);
    }
  }

  parseWebhookEvent(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): PaymentWebhookEvent {
    // Flutterwave's webhook check is a plain shared-secret header
    // comparison (verif-hash) rather than an HMAC over the body.
    if (!signatureHeader || signatureHeader !== this.webhookSecretHash) {
      throw new PaymentProviderError("Invalid Flutterwave verif-hash header.");
    }

    const event = JSON.parse(rawBody.toString("utf8")) as {
      event?: string;
      status?: string;
      data: { status: string; id: number; tx_ref: string };
    };

    if (event.data.status === "successful") {
      return {
        providerCheckoutId: event.data.tx_ref,
        outcome: "succeeded",
        providerReference: String(event.data.id),
      };
    }

    return {
      providerCheckoutId: event.data.tx_ref,
      outcome: "failed",
      failureReason: event.data.status,
    };
  }
}
