import type { PaymentProvider } from "../enums/payment-provider.enum.js";

export interface CheckoutParams {
  paymentId: string;
  idempotencyKey: string;
  plan: string;
  amount?: number;
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResult {
  providerCheckoutId: string;
  redirectUrl: string;
}

export interface VerifyResult {
  success: boolean;
  providerReference?: string;
  failureReason?: string;
}

/**
 * A normalized payment-outcome event, produced from a provider's raw
 * webhook payload after its signature has been verified. Billing's
 * webhook handler only ever deals with this shape, never with
 * Stripe/Paystack/Flutterwave's own event formats.
 */
export interface PaymentWebhookEvent {
  providerCheckoutId: string;
  outcome: "succeeded" | "failed";
  providerReference?: string;
  failureReason?: string;
}

export interface PaymentProviderGateway {
  readonly providerName: PaymentProvider;

  /**
   * Creates a checkout session/order with the provider for the given
   * payment attempt and returns where the client should be sent to pay.
   */
  initiateCheckout(params: CheckoutParams): Promise<CheckoutResult>;

  /**
   * Actively asks the provider for the current status of a checkout —
   * used as a fallback verification path when a webhook hasn't (yet)
   * arrived. Never the primary source of truth on its own; webhooks are.
   */
  verifyCheckout(providerCheckoutId: string): Promise<VerifyResult>;

  /**
   * Verifies a webhook request's signature and maps its payload into a
   * normalized PaymentWebhookEvent. Throws PaymentProviderError if the
   * signature is missing or invalid — an unverified payload must never
   * reach Billing's domain logic.
   */
  parseWebhookEvent(rawBody: Buffer, signatureHeader: string | undefined): PaymentWebhookEvent;
}
