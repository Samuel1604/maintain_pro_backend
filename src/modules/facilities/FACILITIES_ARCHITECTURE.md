# Facilities Module Architecture

## 1. Purpose

Facilities are the organization-scoped physical sites where assets, locations, work orders, inventory, and technicians operate. This module owns facility identity, address, status, access scope, and core metadata.

## 2. Folder map

- Routes/controllers define facility list, detail, create, update, and status operations.
- Schemas/types validate names, addresses, coordinates, and status values.
- Services enforce organization ownership and role permissions.
- Repositories/models persist facilities and query them by tenant and status.

## 3. Flow and boundaries

An authorized organization actor creates or updates a facility. Child modules resolve the facility through organization scope before creating assets, locations, or work orders. Facility IDs must never be trusted without a tenant check.

Facility deactivation should be deliberate: existing history remains readable, while new operational records may be blocked according to domain policy. Hard deletion requires explicit dependency handling.

## 4. Failure behavior

Duplicate names, invalid coordinates, missing organization context, and unauthorized changes are application errors. Database outages are retryable; cascading deletion should never happen implicitly.

## 5. Testing expectations

Test tenant isolation, role access, duplicate handling, status changes, child-record references, pagination, filtering, and deactivation behavior.

## 6. Trade-offs and future work

Hierarchical data matches real operations but requires careful lifecycle rules. Future work includes geocoding, GIS search, facility imports, and configurable facility-level access policies.
