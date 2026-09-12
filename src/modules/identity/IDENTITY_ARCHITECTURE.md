# Identity Module Architecture

## 1. Purpose

Identity owns the security boundary for authentication and account recovery. It proves who a caller is, creates and rotates sessions, verifies account ownership, and raises security events. Authorization decisions remain in route policy and domain services.

## 2. Folder map

- `auth.controller.ts` and `auth.routes.ts` expose registration, login, refresh, logout, password, verification, and recovery endpoints.
- `auth.service.ts` coordinates user lookup, password checks, token issuance, and security events.
- `oauth/` adapts Google and LinkedIn identity providers.
- `session/` stores hashed refresh-token records and handles rotation, revocation, reuse detection, and cleanup.
- `lockout/` tracks failed authentication and temporary account protection.
- `verification-link/` creates and consumes email-verification or recovery links.
- `events/` defines identity event payloads consumed by audit, security, and email listeners.
- `auth.utils.ts` and shared JWT helpers create and verify signed tokens without exposing secrets.

## 3. Authentication flow

1. The controller validates the request and applies rate/verification policy.
2. The service loads the user and checks password or OAuth identity.
3. A short-lived access token and a rotated refresh token are created.
4. Only token hashes and session metadata are persisted.
5. Secure cookies are returned to the client; raw refresh tokens are never stored in MongoDB.
6. Login, logout, password, recovery, and suspicious reuse actions publish events for audit and alerts.

## 4. Session lifecycle

Each refresh token belongs to a session family. Refresh rotates the token and marks the previous record as replaced. Logout revokes one session; logout-all and security events revoke a family or all sessions as appropriate. Reuse of a rotated token is treated as a security signal and must not mint a new session.

Expired sessions are retained for 90 days through the MongoDB TTL policy so investigators can inspect recent revocations without allowing unbounded growth.

## 5. OAuth boundaries

OAuth adapters verify the provider response and map it to a MaintainPro user. Provider access tokens and client secrets remain outside domain records. Account linking must require an authenticated user and a verified provider identity.

## 6. Authorization relationship

Identity supplies the authenticated actor: user ID, role, organization ID, vendor ID, facility ID, and verification state. Domain services still enforce ownership, role permissions, and tenant boundaries. Authentication alone never grants access to an organization record.

## 7. Security rules

- Hash passwords and refresh tokens with approved algorithms.
- Use secure, httpOnly, same-site cookies in production.
- Rate-limit login, OTP, recovery, and verification endpoints.
- Do not log passwords, tokens, OTP values, or provider secrets.
- Use generic failure messages where detailed responses could reveal account existence.
- Revoke sessions after password changes and confirmed token reuse.

## 8. Failure behavior

Invalid credentials, expired links, revoked sessions, and malformed tokens are non-successful outcomes and should be safe to retry only when the caller can correct the input. Database and provider timeouts remain retryable at the infrastructure boundary. Security events must be emitted even when a user-facing response is intentionally generic.

## 9. Testing expectations

Tests should cover registration, login, refresh rotation, concurrent refresh, reuse detection, logout, password-change revocation, OTP expiry, recovery links, OAuth mapping, rate limits, lockout, cookie flags, and event/audit output.

## 10. Trade-offs

Cookie-based sessions and rotation provide strong browser security and revocation control, but require MongoDB state and cleanup. Multiple OAuth providers improve adoption while increasing provider-specific failure and account-linking cases.

## 11. Future work

- Add WebAuthn or passkey support.
- Add session-management UI with device and location details.
- Add token-rotation telemetry and security dashboards.
- Add a dedicated security worker for alerts that must not be starved by analytics.
