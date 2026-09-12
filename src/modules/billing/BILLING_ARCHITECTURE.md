# Billing Module Architecture

## 1. Purpose

Billing owns subscription state, plan changes, checkout initialization, payment records, provider selection, and webhook-driven status updates. It does not store card details or make the frontend responsible for provider secrets.

## 2. Folder map

- `billing.controller.ts` and `billing.routes.ts` expose subscription, upgrade, downgrade, cancellation, checkout, and webhook operations.
- `billing.service.ts` enforces owner scope, plan transitions, payment creation, and provider callbacks.
- `billing.policy.ts` defines who may manage billing and which plans or transitions are allowed.
- `billing.config.ts` contains plan, cycle, currency, and provider defaults.
- `payments/` stores payment records, provider references, statuses, and repository queries.
- `providers/` implements the common gateway interface for mock, Stripe, Paystack, and Flutterwave.
- `payment-provider.factory.ts` selects a provider and injects server-side credentials from validated configuration.
- `exceptions/` translates provider/configuration failures into safe application errors.

## 3. Subscription flow

1. An authorized organization or vendor owner chooses a plan and billing cycle.
2. The service validates ownership, plan availability, and transition policy.
3. A subscription record is created or changed with the selected provider.
4. A payment record is created with an application idempotency key.
5. Paid providers initialize hosted checkout and return a redirect URL.
6. The provider confirms payment through a signed webhook or verification call.
7. The service updates payment and subscription state and emits audit/events.

Free or mock flows may complete locally. Live providers collect card details on their hosted pages; the browser must never receive secret keys or send raw card data to MaintainPro.

## 4. Provider contract

Every provider implements checkout initialization, verification, subscription operations where supported, and webhook parsing. The factory is the only place that selects a provider implementation. Provider-specific SDK types and credentials remain inside the provider adapter.

Supported providers:

- Mock for development and deterministic tests.
- Stripe for international card and wallet processing.
- Paystack for hosted African payment checkout.
- Flutterwave for hosted card and bank-transfer flows.

Provider availability is configuration-driven. Missing credentials must produce a clear server error and never silently fall back to mock in production.

## 5. Webhook security

Webhook routes identify the provider, verify the provider signature against the raw request body, and reject invalid or missing signatures. The handler must be idempotent because providers retry webhooks. Provider references and event IDs should prevent duplicate state transitions.

## 6. Money and currency

Amounts must use the provider's smallest currency unit when sent externally and a consistent application representation internally. Currency, plan price, cycle, and trial rules come from billing configuration rather than frontend values.

## 7. Permissions and tenant boundaries

Only the organization owner/admin or vendor lead permitted by billing policy may create, upgrade, downgrade, or cancel a subscription. Every subscription and payment query must scope to the actor's organization or vendor. Webhooks use provider references, not user-supplied tenant IDs.

## 8. Failure behavior

Invalid plans, unsupported transitions, missing credentials, invalid signatures, and malformed provider responses are non-retryable application failures. Network timeouts, provider rate limits, and temporary provider errors are retryable through queue or provider policy. Ambiguous payment results must be verified before marking a payment failed.

## 9. Testing expectations

Test plan and cycle validation, owner authorization, provider selection, missing configuration, checkout redirects, amount conversion, webhook signature verification, duplicate webhooks, provider errors, idempotency, and subscription status transitions. Provider adapters should be tested with mocked HTTP responses.

## 10. Trade-offs

Hosted checkout reduces PCI exposure and keeps provider credentials server-side, but it adds redirect and webhook eventual consistency. A common provider interface makes switching easy, while not every provider supports identical subscription features.

## 11. Future work

- Add safe provider capability discovery for the UI.
- Add reconciliation jobs for payments without matching webhooks.
- Add provider health checks and operational metrics.
- Add invoice, refund, tax, and failed-payment recovery workflows.
