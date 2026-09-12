# Procurement Module Architecture

## Purpose

Procurement coordinates the marketplace path from an organization's opportunity through vendor responses, review, quotation comparison, and award. It provides workflow coordination without owning every child record.

## Folder map

Opportunity services own the request for vendor work. Vendor applications own submissions and review state. Quotations own offer revisions. Contract awards own the final selection. Procurement event services translate lifecycle changes into stable domain events.

## Workflow

An opportunity is created with service scope and eligibility rules, vendors respond, reviewers shortlist or reject responses, quotations are compared, and an authorized award activates the chosen relationship. Every step preserves organization and vendor scope.

## Boundaries

Procurement may coordinate modules through public services and events, but must not import private models or duplicate quotation, application, or award rules. Financial terms are recorded for operational audit and use billing only through its public contract.

## Testing and future work

Test workflow authorization, deadlines, event ordering, duplicate submissions, award consistency, tenant isolation, and failed downstream reactions. Future work includes versioned procurement contracts, external sourcing, and configurable evaluation scoring.

## Trade-offs

Event translation keeps modules decoupled but requires stable event names and eventual-consistency handling.
