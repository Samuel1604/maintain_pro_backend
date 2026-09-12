# Vendor Applications Module Architecture

## Purpose

Vendor applications represent a vendor's response to an organization's marketplace opportunity. The module owns submission, credentials, review state, shortlist decisions, acceptance, rejection, and application history.

## Folder map

Routes/controllers expose vendor submission and organization review actions. Schemas/types validate opportunity references, offer details, credentials, and state transitions. Services enforce vendor eligibility and reviewer permissions. Repositories/models persist applications and history.

## Lifecycle

An application moves from draft or submitted to under review, shortlisted, accepted, rejected, withdrawn, or closed according to the supported contract. Each decision records actor, timestamp, reason, and organization scope.

## Boundaries

Vendor users may create and manage their own submissions. Organization reviewers may evaluate applications for their organization. Quotations and contract awards consume application decisions but do not directly mutate application state.

## Reliability and testing

Submission retries require an idempotency key or duplicate check. Test eligibility, deadline handling, reviewer authorization, state transitions, duplicate submissions, rejection reasons, events, and audit records.

## Trade-offs and future work

Explicit states support marketplace governance but coordinate with quotations and awards. Future work includes configurable review workflows, compliance checks, scoring, and reviewer assignment.
