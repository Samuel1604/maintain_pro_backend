# Reports Module Architecture

## 1. Purpose

Reports provide read-focused summaries, trends, compliance views, vendor performance, inventory analysis, and exportable operational records. Reports describe existing data; they do not become a second source of truth.

## 2. Folder map

- Routes/controllers validate report type, tenant scope, date range, filters, and pagination.
- Query/services assemble summaries and trend points from domain repositories.
- DTOs define stable response shapes for frontend charts and tables.
- Queue jobs handle exports or queries that may exceed request time limits.
- Report APIs expose maintenance, work-order, preventive, SLA, vendor, and inventory views.

## 3. Flow

1. The actor requests a report with an allowed date range and filters.
2. The service applies organization, facility, and role scope before querying.
3. The query returns summary, trend, table, or compliance data.
4. Large exports become tracked jobs and provide status rather than blocking the request.
5. Generated artifacts follow upload and retention policies.

## 4. Data correctness

Metrics must be derived from real records and clearly define time zones, statuses, and inclusion rules. A report should not fabricate values when no data exists; it should return an empty result with an understandable state.

## 5. Performance and testing

Use indexed filters, bounded date ranges, pagination, aggregation limits, and read projections. Test tenant isolation, facility scope, date boundaries, empty data, large datasets, status definitions, export retries, and stable response contracts.

## 6. Trade-offs and future work

Live queries avoid duplicated write models but can become expensive as data grows. Future work includes read models, warehouse integration, cached report snapshots, export history, and report-specific permissions.
