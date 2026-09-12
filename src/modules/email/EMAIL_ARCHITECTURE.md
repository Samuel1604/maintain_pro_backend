# Email Module Architecture

## 1. Purpose

Email sends transactional and operational messages such as invitations, password recovery, login notifications, work-order updates, billing notices, and marketplace decisions. It is an asynchronous delivery boundary, not a place for business decisions.

## 2. Folder map

- `email-provider.factory.ts` selects the configured provider.
- `providers/` implements SMTP and external provider adapters behind one interface.
- `providers/mailforge.provider.ts` sends through Mailforge using account-scoped Bearer authentication and returns Mailforge delivery IDs.
- Templates and payload types describe supported messages without importing provider SDK types.
- Queue workers perform delivery outside the request process.
- Event listeners translate domain facts into email jobs.

## 3. Delivery flow

1. A domain event or service requests a named email template.
2. The listener validates recipient and template data.
3. A queue job stores a safe payload and stable delivery key.
4. The worker selects the provider and sends the message.
5. Temporary failures retry with backoff; permanent failures are logged and sent to the DLQ when policy requires.
6. Delivery results are recorded where the workflow needs reconciliation.

## 4. Provider boundaries

Provider credentials remain in server configuration. Templates must not contain provider-specific request objects. SMTP, API, and future providers must implement the same application-level send contract.

For production Mailforge, set `MAIL_PROVIDER=mailforge`, configure `MAILFORGE_URL`, `MAILFORGE_ACCOUNT_ID`, and `MAILFORGE_API_KEY`, and keep the API key server-side. The provider maps event/correlation metadata to Mailforge idempotency metadata.

## 5. Reliability and privacy

Email is not exactly-once because a provider may accept a message before the process times out. Use a stable provider idempotency key where available, persist delivery state, and document ambiguous outcomes. Never log tokens, passwords, OTP values, or full reset links.

## 6. Testing expectations

Test template rendering, missing variables, recipient validation, provider selection, provider failure classification, retry/DLQ behavior, idempotency keys, redaction, and queue trace metadata.

## 7. Trade-offs and future work

Asynchronous delivery keeps user requests fast but creates eventual notification timing. Future work includes provider receipts, bounce handling, template versioning, localization, and delivery dashboards.
