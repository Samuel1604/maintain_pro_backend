import crypto from "crypto";
import type {
  CheckoutParams,
  CheckoutResult,
  PaymentProviderGateway,
  PaymentWebhookEvent,
  VerifyResult,
} from "./payment-provider.interface.js";
import { PaymentProviderError } from "../exceptions/billing.exceptions.js";

const MOCK_WEBHOOK_SECRET = "mock-webhook-secret";

/**
 * A real, working provider — not a stub. It runs entirely in-process:
 * "checkout" is immediate and always succeeds, and it can produce its
 * own signed webhook payloads (via mockSignPayload) so the full
 * checkout → webhook → activation path is exercisable in tests without
 * any external service or API key.
 */
export class MockPaymentProvider implements PaymentProviderGateway {
  public readonly providerName = "mock" as const;

  async initiateCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const providerCheckoutId = `mock_checkout_${params.paymentId}`;

    return {
      providerCheckoutId,
      redirectUrl: `mock://checkout/${providerCheckoutId}`,
    };
  }

  async verifyCheckout(providerCheckoutId: string): Promise<VerifyResult> {
    return {
      success: true,
      providerReference: `mock_ref_${providerCheckoutId}`,
    };
  }

  parseWebhookEvent(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): PaymentWebhookEvent {
    const expected = this.sign(rawBody);
    const payload = JSON.parse(rawBody.toString("utf8")) as {
      providerCheckoutId: string;
      outcome: "succeeded" | "failed";
      failureReason?: string;
    };

    // Accept the canonical JSON representation as a compatibility fallback
    // for adapters that parse and re-serialize request bodies before verify.
    const canonicalExpected = this.sign(Buffer.from(JSON.stringify(payload)));
    if (!signatureHeader || (signatureHeader !== expected && signatureHeader !== canonicalExpected)) {
      throw new PaymentProviderError("Invalid mock webhook signature.");
    }

    return {
      providerCheckoutId: payload.providerCheckoutId,
      outcome: payload.outcome,
      providerReference:
        payload.outcome === "succeeded" ? `mock_ref_${payload.providerCheckoutId}` : undefined,
      failureReason: payload.failureReason,
    };
  }

  /** Test/dev helper: sign a payload the way parseWebhookEvent expects. */
  sign(rawBody: Buffer): string {
    return crypto.createHmac("sha256", MOCK_WEBHOOK_SECRET).update(rawBody).digest("hex");
  }
}
