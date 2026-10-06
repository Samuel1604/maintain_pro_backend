# MaintainPro Backend

The MaintainPro backend is a TypeScript modular monolith that provides the REST API, realtime updates, domain events, background jobs, authentication, tenant isolation, maintenance workflows, inventory, procurement, vendors, billing, and reporting.

## Stack

- Node.js `>=22.13.1 <23`
- Express 5 and TypeScript
- MongoDB with Mongoose
- Redis with BullMQ for durable queues and workers
- Socket.IO for realtime updates
- Zod for request validation
- Cloudinary/Multer for file uploads

## Local setup

Prerequisites: Node.js `22.13.x`, MongoDB, and Redis when using BullMQ locally.

```bash
npm install
cp .env.example .env
# Update .env with local secrets and service URLs.
npm run dev
```

The API listens on `http://localhost:8000` by default and exposes routes under `http://localhost:8000/api/v1`.

The frontend is a separate project and normally runs at `http://localhost:3000`.

## Queues and workers

The HTTP server and background worker run as separate processes:

```bash
npm run dev          # API server
npm run worker:dev   # background worker in development
```

For a built deployment:

```bash
npm run build
npm start            # API server
npm run worker:start # background worker
```

`QUEUE_DRIVER=bullmq` uses Redis for durable jobs, retries, and scheduled work. `QUEUE_DRIVER=in-memory` is intended only for local development and tests; production validation rejects it. Domain events are published to the queue and processed by registered workers.

## Environment

Copy `.env.example` and configure at least `NODE_ENV`, `PORT`, `CLIENT_URL`, `MONGODB_URI`, `QUEUE_DRIVER`, Redis settings, and the required authentication secrets. Mail, OAuth, payment, storage, and notification settings are configured in the same file when those integrations are enabled.

Never commit `.env`, production secrets, payment credentials, or private keys. Production validation rejects localhost MongoDB/Redis and in-memory queues.

## Commands

| Command                  | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| `npm run dev`            | Start the API with `tsx` watch mode                      |
| `npm run worker:dev`     | Start the background worker with watch mode              |
| `npm run build`          | Type-check, compile, alias imports, and verify the build |
| `npm start`              | Start the compiled API from `dist/server.js`             |
| `npm run worker:start`   | Start the compiled worker                                |
| `npm run type-check`     | Run TypeScript without emitting files                    |
| `npm run lint`           | Check ESLint rules                                       |
| `npm run format`         | Format backend files with Prettier                       |
| `npm run format:check`   | Verify Prettier formatting                               |
| `npm test`               | Run the Vitest suite                                     |
| `npm run verify`         | Run formatting, lint, type-check, tests, and build       |
| `npm run release:verify` | Run release-readiness checks                             |

## Continuous deployment

`Backend CD` runs after `Backend CI` succeeds on `main` and triggers the single Render web service defined in [`render.yaml`](./render.yaml). Render starts `node dist/start-all.js`, which supervises both the API server and BullMQ worker in the same service.

Configure the Render deploy hook URL as the GitHub Actions production-environment secret `RENDER_DEPLOY_HOOK_URL`. The deployment workflow fails clearly when that secret is missing.

## Integration tests

Start disposable infrastructure:

```bash
docker compose -f docker-compose.infrastructure.yml up -d mongodb redis
```

Then run tests against a disposable database:

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/maintainpro_test \
REDIS_DISABLE_CONNECTION=false npm test
```

Do not point `TEST_MONGODB_URI` at a shared or production database.

## Repository structure

```text
src/
├── config/             # Environment, database, Redis, and application config
├── container/          # Application dependency container and lifecycle
├── infrastructure/     # Queues, events, jobs, realtime, storage, logging
├── modules/            # Domain modules and their routes/services/repositories
├── shared/             # Authorization, errors, responses, validators, types
├── tests/              # Unit, integration, security, and workflow tests
├── app.ts              # Express middleware and route composition
├── server.ts           # HTTP API bootstrap and graceful shutdown
└── worker.ts           # Background worker bootstrap
```

Each domain module owns its schema, model, repository, service, controller, and routes where applicable. MongoDB is the system of record; Redis/BullMQ is the operational transport for asynchronous work.

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — backend architecture and boundaries
- [`API_ENDPOINTS_ARCHITECTURE.md`](./API_ENDPOINTS_ARCHITECTURE.md) — endpoint organization
- [`DEPLOYMENT_READINESS.md`](./DEPLOYMENT_READINESS.md) — deployment checks
- [`ARCHITECTURE_DOCUMENTATION_INDEX.md`](./ARCHITECTURE_DOCUMENTATION_INDEX.md) — documentation index
- Module-specific API and architecture documents live beside their modules under `src/modules/`.

The dashboard, invoices, and search module boundaries are documented in their module folders, including current MVP limitations where a full service/repository boundary is not yet present.

## License

ISC
