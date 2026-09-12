# Asset History Module Architecture

## 1. Purpose

Asset history records durable changes and maintenance events associated with an asset so operators can understand condition, service, ownership, and lifecycle over time.

## 2. Folder map

Models and schemas define history entries. Services create entries from authorized asset or work-order workflows. Repositories query chronological history by asset, organization, and event type.

## 3. Boundaries

History is append-oriented evidence, not a mutable copy of the current asset. Asset services own current state; work orders own execution details; history links the two through IDs and safe summaries.

## 4. Reliability and testing

History writes should be idempotent when triggered by retried events and must preserve event/actor IDs. Test ordering, tenant filtering, duplicate events, redaction, pagination, and behavior when a referenced asset is deactivated.

## 5. Trade-offs and future work

Append-only records simplify investigation but increase volume. Future work includes retention classes, telemetry projections, export, and asset health analytics.
