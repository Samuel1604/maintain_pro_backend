# Assets Module Architecture

## 1. Purpose

Assets are maintainable physical equipment and infrastructure. This module owns asset identity, category, manufacturer, serial data, condition, lifecycle, facility scope, and links to work orders.

## 2. Folder map

- Routes/controllers expose asset list, detail, create, update, import, and status operations.
- Schemas/types validate asset fields, facility context, categories, and filters.
- Services enforce organization/facility ownership and asset lifecycle rules.
- Repositories/models persist assets, history, and searchable metadata.

## 3. Flow and boundaries

An asset must belong to an organization and normally a facility. A work order may reference an asset, but the asset service remains the owner of asset state. Import operations must validate each row and report failures without creating cross-tenant records.

Asset deactivation preserves maintenance history but prevents inappropriate new assignments. Serial numbers and external identifiers should be unique within the intended tenant scope.

## 4. Reliability and integrations

Asset updates should emit audit/events when they affect maintenance decisions. Future telemetry integrations must write measurements separately from core asset identity so high-volume readings do not inflate the asset document.

## 5. Testing expectations

Test required facility context, tenant isolation, serial uniqueness, import validation, status changes, asset/work-order linking, filtering, pagination, and event output.

## 6. Trade-offs and future work

Normalized references improve reporting but require joins and population. Future work includes IoT telemetry, QR/barcode scanning, asset import pipelines, and lifecycle analytics.
