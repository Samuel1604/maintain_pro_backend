# MaintainPro Cache Contract

Caching is best-effort performance infrastructure. MongoDB and application services remain authoritative. Redis is never used for mutation decisions, authorization, sessions, billing, or financial state.

| Resource              | Source of truth        | Key                                      | TTL       | Invalidation                 | Sensitivity/fallback                                |
| --------------------- | ---------------------- | ---------------------------------------- | --------- | ---------------------------- | --------------------------------------------------- |
| User settings         | `UserSettings`         | `cache:v1:user:{userId}:settings`        | 5 minutes | user settings update         | user-scoped DTO; query MongoDB on miss/error        |
| Organization settings | `OrganizationSettings` | `cache:v1:org:{organizationId}:settings` | 5 minutes | organization settings update | tenant-scoped DTO; authorization runs before lookup |
| Vendor settings       | `VendorSettings`       | `cache:v1:vendor:{vendorId}:settings`    | 5 minutes | vendor settings update       | vendor-scoped DTO; authorization runs before lookup |

Keys use a versioned namespace and stable scope identifiers. Complex query hashing is not currently needed because only settings are cached. Values are JSON DTO/read-model representations; malformed values are deleted and treated as misses.

Redis failures, timeouts, malformed values, and write failures do not make settings unavailable. Reads fall back to MongoDB and writes succeed even when cache invalidation or population fails. Cache operations log namespace, operation, and latency without payloads.

The existing domain event bus remains the integration point for future cache invalidation of facilities, marketplace relationships, reports, inventory read models, and notification counts. Those resources are deliberately not cached until their event contracts and invalidation rules are complete. Inventory balances, Work Order/Service Request state, billing/payment state, sessions, authorization decisions, and rapidly changing notifications remain uncached.
