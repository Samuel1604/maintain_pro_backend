# Contract Awards Module Architecture

## Purpose

Contract awards record the organization's final decision to select a vendor and establish the agreement that can become active operational work.

## Folder map

Routes/controllers expose award creation, review, activation, and termination. Schemas/types validate quotation, vendor, scope, dates, and financial terms. Services enforce reviewer authority and lifecycle rules. Repositories/models persist award history.

## Flow

An authorized reviewer selects a quotation, creates an award, and records rationale. Activation verifies the opportunity, vendor, quotation, facilities, dates, and attached SLA. Termination preserves history and prevents new work under the award.

## Boundaries

Awards own the selection decision. Quotations own offers, contracts own ongoing terms, and SLAs own service targets. Activation must coordinate these records through public services or events rather than private model imports.

## Testing and future work

Test reviewer permissions, duplicate awards, date and scope validation, activation prerequisites, termination, audit output, event publication, and concurrent activation. Future work includes contract document storage and e-signatures.

## Trade-offs

Durable awards support audit and renewal, while activation coordinates several aggregates and requires careful failure recovery.
