# Service Requests Module Architecture

## Purpose

Service requests capture a maintenance need before it becomes an operational work order. The module owns intake, requester context, triage, approval, rejection, and conversion linkage.

## Folder map

Routes/controllers expose request intake and review. Schemas/types validate descriptions, facility/location context, priority, and status. Services enforce requester and reviewer permissions. Repositories/models persist requests and conversion references.

## Lifecycle

Requests begin as submitted, then move through triage and an approval decision. An approved request may convert to one work order; rejected requests retain the reason and history. Conversion must preserve the source request ID and must not duplicate a work order on retry.

## Boundaries

This module owns the request lifecycle. Work Orders owns assignment, execution, comments, completion, and SLA activity after conversion. Reviewers may decide only within their organization and facility scope.

## Failure and testing

Invalid transitions, missing facility context, duplicate conversion, and unauthorized review are non-retryable. Test lifecycle transitions, conversion idempotency, tenant isolation, permissions, rejection reasons, and event/audit output.

## Trade-offs and future work

An explicit conversion boundary improves auditability but adds workflow steps. Future work includes configurable approval policies, intake channels, and event-driven SLA timers.
