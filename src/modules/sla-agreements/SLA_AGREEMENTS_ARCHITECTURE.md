# SLA Agreements Module Architecture

## Purpose

SLA agreements define the response, resolution, coverage, operating-hours, escalation, and breach rules attached to a vendor contract.

## Folder map

Routes/controllers expose agreement creation, update, activation, and detail views. Schemas/types validate target units, priorities, dates, coverage, and exclusions. Services enforce organization/vendor contract scope. Models persist targets, policies, and history.

## Flow

An SLA is drafted against a contract, reviewed, activated, and applied to eligible work orders. Timers or workers compare actual response/resolution timestamps with targets and emit approaching-breach or breach events.

## Boundaries

The SLA module owns target definitions and evaluation. Work orders own execution timestamps; contracts own commercial relationship and dates; notifications own delivery of alerts.

## Reliability and testing

Test time-unit conversion, business-calendar exceptions, priority selection, overlapping agreements, activation dates, missing targets, breach idempotency, and tenant isolation. Long-running timers should be checkpointed or scheduled through queues.

## Trade-offs and future work

Explicit target records are auditable but require consistent time units and calendar logic. Future work includes calendar-aware timers, escalation configuration, compliance dashboards, and vendor performance projections.
