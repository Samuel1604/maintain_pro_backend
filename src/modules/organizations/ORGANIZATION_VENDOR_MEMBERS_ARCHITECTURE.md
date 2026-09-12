# Organization-bound vendor members

This module will represent people invited directly by an organization to perform vendor-like operational work inside that organization. They are not marketplace Vendors and must never appear in public marketplace discovery, vendor applications, or marketplace relationship queries.

## Why this is separate

Marketplace Vendors are reusable external businesses with their own identity, portal, service coverage, and relationships. An organization-bound vendor member is closer to an external technician roster entry: the inviting organization owns the membership, facility scope, role, and lifecycle. Reusing `vendorId` for this case would make private workers visible to marketplace logic and would make identity authorization ambiguous.

## Invariants

- One membership per organization and user.
- Membership status is organization-owned.
- Facility scope and service categories are stored on the membership.
- Removing a membership does not delete the underlying user account.
- Marketplace Vendor queries must not use this collection.

## Planned integration

The next phase will extend invitations so acceptance creates or activates a membership. A later phase will add organization-only list, update, suspend, and Work Order assignment endpoints. Existing marketplace vendor roles and flows remain unchanged until those migrations are complete.

## Trade-offs and future improvements

This adds a second operational identity concept, but it keeps marketplace privacy and authorization clear. Future work may add membership-level audit history, facility-specific permissions, bulk invitations, and conversion from an organization-bound member to a marketplace Vendor through an explicit opt-in flow.
