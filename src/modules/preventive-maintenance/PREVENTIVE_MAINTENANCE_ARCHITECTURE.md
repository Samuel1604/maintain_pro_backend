# Preventive Maintenance Module Architecture

## 1. Purpose

Preventive maintenance schedules recurring inspections and service tasks before equipment fails. The module owns plans, frequencies, checklist definitions, asset coverage, occurrences, skips, and generated work-order links.

## 2. Folder map

Routes/controllers expose plan and occurrence operations. Schemas/types validate frequency, dates, asset scope, and checklist input. Services calculate occurrences and enforce facility/organization ownership. Event files connect due or missed work to work-order and notification workflows.

## 3. Lifecycle

A plan is created, activated, paused, edited, or retired. Active plans produce occurrences according to frequency and timezone. An occurrence may be completed, skipped with a reason, overdue, or converted to a work order. Generation must be idempotent so a scheduler restart does not duplicate work.

## 4. Boundaries and testing

The module owns schedule state; work orders own execution. Test timezone and date boundaries, frequency calculation, duplicate generation, skip reasons, asset scope, tenant isolation, activation, and event output.

## 5. Trade-offs and future work

Generating occurrences ahead of time improves visibility but creates cleanup and rescheduling work. Future work includes calendar exceptions, technician checklists, sensor-triggered maintenance, and distributed schedule execution.
