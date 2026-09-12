import { InternalServerException } from "@/shared/errors/index.js";

/**
 * A payment provider is selected but its required configuration (API
 * keys, webhook secret, etc.) is missing. Distinct from a provider-side
 * failure — this is a deployment/config problem, not a payment problem.
 */
export class PaymentProviderConfigurationError extends InternalServerException {
  constructor(message: string) {
    super(message);
  }
}

/**
 * The provider rejected the request, returned an error, or a webhook
 * signature failed verification. Wraps the upstream detail rather than
 * exposing it directly — callers see a generic, safe message; the real
 * cause is available on `.cause` for logging only, never in the response.
 */
export class PaymentProviderError extends InternalServerException {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
  }
}
