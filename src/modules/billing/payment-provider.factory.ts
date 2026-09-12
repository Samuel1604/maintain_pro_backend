import type { PaymentProvider } from "./enums/payment-provider.enum.js";
import type { PaymentProviderGateway } from "./providers/payment-provider.interface.js";
import { MockPaymentProvider } from "./providers/mock.provider.js";
import { StripeProvider } from "./providers/stripe.provider.js";
import { PaystackProvider } from "./providers/paystack.provider.js";
import { FlutterwaveProvider } from "./providers/flutterwave.provider.js";
import { env } from "@/config/env.js";

/**
 * The only place in the application that knows which concrete
 * PaymentProviderGateway implementations exist. BillingService and
 * everything downstream of it depend solely on the PaymentProviderGateway
 * interface — never on a concrete provider class directly.
 *
 * Providers that need real credentials (Stripe/Paystack/Flutterwave)
 * throw PaymentProviderConfigurationError from their own constructor if
 * unconfigured — that error surfaces only when that specific provider is
 * actually selected, so "mock" keeps working in any environment with
 * zero configuration.
 */
export function createPaymentProvider(provider: PaymentProvider): PaymentProviderGateway {
  switch (provider) {
    case "mock":
      return new MockPaymentProvider();

    case "stripe":
      return new StripeProvider({ secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET });

    case "paystack":
      return new PaystackProvider({ secretKey: env.PAYSTACK_SECRET_KEY });

    case "flutterwave":
      return new FlutterwaveProvider({ secretKey: env.FLUTTERWAVE_SECRET_KEY, webhookSecretHash: env.FLUTTERWAVE_WEBHOOK_SECRET_HASH });

    default:
      throw new Error(`Unsupported payment provider: ${String(provider)}`);
  }
}
