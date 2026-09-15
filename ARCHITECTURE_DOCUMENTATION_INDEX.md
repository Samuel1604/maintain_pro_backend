# Architecture Documentation Index

Architecture decisions are documented next to the code they govern using the
`NAME_ARCHITECTURE.md` convention. The documents at `src/`, `src/modules/`,
`src/infrastructure/`, `src/shared/`, `src/infrastructure/realtime/`, and `src/tests/` describe
the major boundaries. Capability-specific documents live inside their module
folders.

## Documentation rule for nested folders

Nested folders that only contain implementation details inherit the decision
record from their nearest documented parent. A nested folder receives its own
`NAME_ARCHITECTURE.md` when it introduces a new boundary, provider, protocol,
security model, persistence model, or operational lifecycle.

Every new backend folder should add its architecture document at creation time,
covering:

1. Purpose and ownership
2. Architectural decisions
3. Alternatives rejected
4. Trade-offs and operational risks
5. Future improvements
6. Planned external integrations
7. Testing and observability expectations

This keeps the documentation evolutionary rather than treating it as a one-time
inventory.
