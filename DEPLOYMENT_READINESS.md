# MaintainPro backend deployment guide

## Release model

MaintainPro is deployed from one container image as two separately supervised
services:

- **API** — `node dist/server.js`; handles HTTP and realtime traffic only.
- **Worker** — `node dist/worker.js`; consumes BullMQ jobs only.

Do not run more than one worker process per intended worker replica. The API
does not start workers. Scale the API and worker independently.

`docker-compose.production.yml` is the portable reference deployment. It
expects managed MongoDB and Redis; it deliberately does not provision local
data services for production.

## Required production configuration

Supply every secret through the deployment platform's secret manager. Never
commit `.env.production`.

Required baseline values are:

- `NODE_ENV=production`, `PORT=8000`, `CLIENT_URL`, and `FRONTEND_URL` using HTTPS.
- A transaction-capable managed `MONGODB_URI` (MongoDB replica set) and a TLS
  `REDIS_URL` for queues, idempotency, rate limits, and cache.
- Independent JWT and OAuth-state secrets of at least 32 characters.
- A configured mail provider and verified sender address.
- Google OAuth values when Google sign-in is enabled by the current runtime
  configuration.
- Credentials for only the storage and payment providers enabled for the
  deployment.

Begin from `.env.production.example`. The application rejects localhost data
services, non-HTTPS public URLs, and any enabled ngrok/Cloudflare tunnel in
production.

Rotate any credential that has ever appeared outside a secret manager before
deploying it.

## Index migration prerequisite

Do not rely on background Mongoose auto-index creation for production writes.
Before enabling traffic for a release that adds a unique index, run the
corresponding migration against a staging snapshot first, inspect duplicate
records, remediate them explicitly, create the index, and verify it with
`listIndexes`. In particular, verify the sparse unique
`workorders.serviceRequestId` index before enabling concurrent service-request
approval. The work-order race test intentionally calls `createIndexes()`
before writes to model this release prerequisite.

## Build and deploy

```bash
cd backend
npm ci
npm run type-check
npm run lint
npm run build
npm run release:verify
DEPLOY_ENV_FILE=.env.production docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

For a managed host, use the same built image for both services and override
the command with `node dist/worker.js` for the worker service. Configure the
API health probe as `GET /api/v1/health/live`; use the readiness endpoint for
traffic admission.

## Health, rollout, and rollback

- `/api/v1/health/live` confirms the process is running.
- `/api/v1/health/ready` returns `200` only when MongoDB and enabled Redis are
  available. An intentionally disabled optional Redis connection is reported
  as `disabled`, not as an outage.
- Deploy to staging first, verify the endpoints, then run authenticated smoke
  checks for login, tenant isolation, work orders, uploads, realtime, and a
  queued job.
- Release to a canary tenant/group, monitor logs, queue backlog, retries,
  DLQ entries, and dependency latency for one normal operating cycle.
- Roll back by redeploying the prior API and worker image. Never delete
  MongoDB data or Redis queues as part of an application rollback.

## Billing webhooks

Configure the provider callback URL as:

`https://api.example.com/api/v1/billing/webhooks/{provider}`

where `{provider}` is `stripe`, `paystack`, or `flutterwave`. Configure the
matching signing secret/hash in the deployment secret manager. Before enabling
live billing, send each provider's signed staging test event and repeat one
event to verify signature rejection and idempotent duplicate handling.

## Release gate

The GitHub backend workflow must pass deterministic install, type-check, lint,
build, release-contract verification, tests against disposable MongoDB and Redis, and a container build. The
frontend workflow must pass its lint, build, and route audit.

Before production traffic is enabled, confirm the release commit is tagged,
the Git status/diff is healthy, production secrets and callback URLs are
configured, the container API is ready, a worker consumes jobs, and the
staging smoke tests have passed.

## Verification record

The current implementation has been verified locally with:

- Backend: 40 test files, 155 passing tests, and one intentional skip, run
  against disposable MongoDB replica-set and Redis services. This includes
  concurrent billing webhook delivery, inventory race/idempotency checks, and
  work-order concurrency coverage.
- Frontend: lint, tests, production build, 27-entry route audit, and
  `npm audit --omit=dev --audit-level=high` pass. Frontend `tsc --noEmit`
  currently exceeds the local three-minute verification window without
  diagnostics and is not recorded as passed.
- Backend type-check, production build, and release-contract verification
  passed. Lint completed with zero errors and one remaining warning in the
  unused legacy logger.
- Security: `npm audit --omit=dev --audit-level=high` reports zero vulnerabilities.
- Container: production image build, compiled import verification, dependency
  pruning, API live health (`200`), and API/worker SIGTERM exit code `0`.
- Compose: production topology validates against `.env.production.example`
  when invoked with `DEPLOY_ENV_FILE=.env.production.example`.

These checks prove the repository implementation and runtime topology. They do
not supply deployment-owned values. Before release, the owner must provide
managed MongoDB and Redis endpoints, HTTPS domains, mail and storage
credentials, provider webhook secrets, rotated JWT/OAuth secrets, and a clean
reviewed Git status. Provider dashboards must also confirm signed Paystack,
Stripe, and Flutterwave callbacks against the deployed HTTPS URL.

## Owner release checklist

The release owner must attach evidence for each item below before promoting
the image:

- [ ] Managed MongoDB URI supplied, TLS enabled, backups/restore procedure
      tested, and the sparse `workorders.serviceRequestId` index verified
      after duplicate-data review.
- [ ] Managed Redis URI supplied, TLS/authentication verified, and queue
      persistence/eviction policy reviewed.
- [ ] `CLIENT_URL`, `FRONTEND_URL`, cookie domain, and CORS origins point to
      the deployed HTTPS domains.
- [ ] JWT access/refresh secrets, OAuth state secret, mail credentials,
      storage credentials, and provider secrets supplied through the platform
      secret manager and rotated from any development values.
- [ ] The selected `BILLING_DEFAULT_PROVIDER` has its required credentials:
      provider secret for Paystack; provider and webhook secrets for Stripe;
      provider secret and webhook secret hash for Flutterwave.
- [ ] Paystack, Stripe, and Flutterwave signatures tested against the public
      webhook URLs; duplicate delivery responses remain idempotent.
- [ ] API and worker services deployed from the same image tag; API readiness
      is healthy and the worker successfully consumes a representative job.
- [ ] Rollback image tag, database backup, secret-rotation owner, and incident
      contact recorded before traffic is enabled.
