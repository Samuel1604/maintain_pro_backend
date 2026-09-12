# Audit Module Architecture

## 1. Purpose

Audit is the durable record of consequential actions. It answers who did what, to which entity, in which tenant, with what outcome, and under which trace or session context.

## 2. Folder map

- `audit.model.ts` defines the MongoDB document, indexes, and retention deadline.
- `audit.types.ts` defines actors, actions, entities, outcomes, severity, and the persisted interface.
- `audit.dto.ts` defines the write input accepted by the service.
- `audit.repository.ts` owns creation and common actor, tenant, target, and entity queries.
- `audit.service.ts` supplies defaults and calculates retention before writing.
- Controllers/listeners in other folders call the service; they should not write the model directly.

## 3. Record contents

An entry may include organization, facility, actor, target user, action, outcome, severity, entity, old values, new values, session metadata, metadata, source, and trace ID. Values must be safe to retain and should contain IDs or summaries rather than secrets.

## 4. Write flow

1. A service or event listener identifies a consequential action.
2. It sends a typed DTO to `AuditLogService`.
3. The service applies safe defaults and calculates `retentionUntil`.
4. The repository creates an append-oriented MongoDB record.
5. Queries return tenant- and entity-scoped history for authorized users.

## 5. Retention

Normal entries are retained for one year. High and critical entries receive longer retention for security and investigation needs. MongoDB TTL cleanup is asynchronous and approximate; operational exports should run before a record reaches its deadline when regulations require longer retention.

## 6. Security and privacy

Never store passwords, raw JWTs, refresh tokens, OTP values, payment card data, provider secrets, or unnecessary personal content. Audit access is administrative and tenant-scoped. Redaction should happen before persistence, not only at response time.

## 7. Relationship to logs and events

Logs are operational diagnostics and may be short-lived. Events trigger reactions. Audit records are durable business evidence. A single action may produce all three, but each must have a clear purpose and trace metadata.

## 8. Testing expectations

Test default values, retention deadlines, severity retention, tenant filtering, entity history, redaction, event-listener writes, failed writes, and pagination or limits for large histories.

## 9. Trade-offs

Append-only records improve accountability and make history easy to reason about, but they increase storage and require careful indexing. Flexible metadata helps modules evolve while reducing strict schema guarantees.

## 10. Future work

- Add archival exports for compliance retention.
- Add tamper-evident digests or signed audit batches.
- Add a consistent pagination contract for audit APIs.
- Add field-level redaction tests for every sensitive workflow.
