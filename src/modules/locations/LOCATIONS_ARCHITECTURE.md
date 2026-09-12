# Locations Module Architecture

## Purpose

Locations are named physical areas inside facilities: rooms, floors, equipment zones, storage areas, and other dispatch destinations. This module owns location identity, hierarchy, metadata, and facility scope.

## Folder map

Routes/controllers expose location CRUD and search. Schemas/types validate names, parent relationships, coordinates, and filters. Services enforce facility and organization ownership. Repositories/models persist the hierarchy and indexes used by dispatch searches.

## Flow and boundaries

A location is created under a facility and may have a parent location. Work orders and assets may reference it, but they cannot bypass the location service's tenant and facility checks. A location cannot be moved across organizations.

Deactivation preserves historical references while preventing new assignments where policy requires. Deletion must check children, assets, work orders, and inventory references before removing anything.

## Testing and future work

Test tenant isolation, facility scope, hierarchy validation, duplicate names, deactivation, search, pagination, and child-reference safety. Future work includes geospatial indexes, routing providers, map selection, and bulk import.

## Trade-offs

Normalized location records avoid repeating addresses and improve reporting, but hierarchy changes require careful synchronization and deletion rules.
