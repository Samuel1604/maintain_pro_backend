# Work Orders Module Architecture

## 1. Purpose

Work orders are the main operational record for maintenance work. This module owns creation, triage, assignment, status transitions, comments, attachments, priority, costs, and links to facilities, locations, assets, vendors, and SLAs.

## 2. Folder map

- Controllers and routes expose list, create, detail, assignment, status, comment, attachment, and reporting operations.
- Schemas and types validate request data, priorities, statuses, assignments, and response shapes.
- `work-order.service.ts` enforces tenant scope, facility access, lifecycle transitions, and side effects.
- Repositories/models persist work orders, comments, history, and related records.
- Event services publish lifecycle changes for audit, notification, marketplace, and SLA reactions.

## 3. Lifecycle

1. A requester creates a work order with organization and facility context.
2. The service validates location, asset, category, priority, and requester permission.
3. Triage assigns a responsible team, technician, or vendor.
4. Work moves through supported statuses such as open, assigned, in progress, on hold, completed, cancelled, or rejected.
5. Completion records work notes, resolution, parts, cost, and SLA outcome.
6. Lifecycle events and audit entries expose the transition to other modules.

Only supported backend transitions may be shown in the UI. A status change must validate the current state and actor permission; clients cannot skip approval or completion requirements.

## 4. Related data

Facilities and locations define where work occurs. Assets identify what is maintained. Vendors and assignments define who performs it. SLA agreements provide response and resolution targets. Comments, attachments, and history explain what happened.

Related IDs must be resolved through the same organization boundary. A valid ID from another tenant must behave as not found, not as an authorization leak.

## 5. Assignment and dispatch

Assignment checks role, facility scope, vendor relationship, availability where supported, and work-order state. Dispatch events may trigger notifications or marketplace matching, but the work-order service remains the source of truth for assignment.

## 6. Failure and concurrency rules

Invalid transitions, missing related records, and unauthorized assignments are non-retryable application errors. Temporary database or provider failures are retryable at the infrastructure boundary. Concurrent edits must use state checks or optimistic update conditions so one transition cannot silently overwrite another.

## 7. Audit and events

Create, assignment, priority, status, approval, completion, cancellation, comment, and attachment actions should retain actor and trace metadata. Events should contain IDs and summaries, not full sensitive documents.

## 8. Testing expectations

Test tenant isolation, facility scope, every supported transition, invalid transitions, assignment permissions, concurrent updates, comments, attachments, SLA calculation, event publication, audit writes, pagination, and empty/error responses.

## 9. Trade-offs

A rich operational aggregate improves traceability but creates guarded transitions and many related queries. Keeping the module as one bounded context makes workflows understandable while requiring careful repository indexes and service boundaries.

## 10. Future work

- Add explicit state-machine validation when transition count grows.
- Add dispatch optimization and technician availability.
- Add offline technician synchronization with conflict handling.
- Add richer SLA timers and escalation automation.
