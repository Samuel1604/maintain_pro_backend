# Quotations Module Architecture

## Purpose

Quotations are vendor offers for an opportunity or work package. This module owns offer validation, immutable revisions, comparison data, submission deadlines, and negotiation history references.

## Folder map

Routes/controllers expose vendor submission and organization review. Schemas/types validate price, scope, response time, exclusions, and revision input. Services enforce vendor/opportunity scope. Repositories/models persist the quotation and revision chain.

## Lifecycle and revisions

A quotation may be drafted, submitted, revised, accepted, rejected, withdrawn, or expired according to the supported lifecycle. A revision creates a new immutable record or revision number; previous offers remain available for audit and comparison.

## Boundaries

Quotation acceptance does not itself activate a contract. Contract awards own selection and activation. Vendor users can edit only their own eligible offers; organization reviewers can read and decide only within their organization.

## Testing and future work

Test revision ordering, duplicate submission, deadline enforcement, amount validation, authorization, comparison queries, and award integration. Future work includes negotiation threads, e-signature, taxes, and structured bid scoring.

## Trade-offs

Immutable revisions improve auditability and dispute resolution but increase storage and query complexity.
