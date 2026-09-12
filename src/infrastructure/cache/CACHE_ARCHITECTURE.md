# Cache Infrastructure Architecture

## Purpose

Cache infrastructure provides Redis-backed temporary storage for read acceleration, rate limits, OTPs, session helpers, and short-lived coordination. Cache data is never the durable source of truth for domain records.

## Folder map

The Redis client owns connection behavior. Cache services own key namespaces, serialization, TTLs, invalidation, and safe failure behavior. Feature modules decide what is worth caching through an injected interface.

## Flow

A service builds a namespaced key, reads or writes with an explicit TTL, and falls back to durable storage when a cache miss occurs. Writes invalidate affected keys or use a versioned key strategy.

## Reliability and safety

Redis outages must not turn stale data into authoritative data. OTP and rate-limit keys require short TTLs and careful privacy. Never place passwords, provider secrets, or unnecessary personal data in cache values.

## Testing and operations

Test cache hit, miss, expiry, invalidation, serialization, Redis outage, namespace isolation, and stampede-sensitive reads. Monitor memory, evictions, latency, connection errors, and key growth.

## Trade-offs and future work

Caching reduces database load but introduces invalidation and stale-read risk. Future work includes cache metrics, stampede protection, namespace tooling, and selective invalidation for high-volume reads.
