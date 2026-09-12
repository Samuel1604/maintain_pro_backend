# Configuration Architecture

## Purpose

Configuration is the single boundary for environment values, secrets, connection settings, security options, provider credentials, and runtime limits. Application code should consume validated configuration instead of reading process environment values throughout the codebase.

## Folder map

- `env.ts` defines and validates the environment schema.
- Database, Redis, JWT, cookie, CORS, rate-limit, and storage config files expose typed settings.
- `.env.example` documents required names without containing real secrets.
- Startup checks validate external dependencies before accepting traffic.

## Startup flow

Configuration loads during bootstrap. Required production values fail startup early. Optional integrations remain disabled until their credentials are present, but selecting an unconfigured provider must return an explicit error.

## Security rules

Secrets remain in deployment configuration or a secret manager. Never commit real values, log secret contents, send secrets to the frontend, or use a frontend variable for a backend provider credential. Diagnostics must redact values.

## Testing and operations

Tests require a complete safe environment contract and may disable external connections. Validate numeric limits, URLs, enum values, and mutually dependent settings. Production configuration should be checked during deployment, not after the first request.

## Trade-offs and future work

Fail-fast startup makes misconfiguration visible but requires disciplined test setup. Future work includes secret-manager adapters, environment profiles, schema-generated configuration documentation, and redacted diagnostics.
