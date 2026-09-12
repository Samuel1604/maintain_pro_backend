# Organization Vendor Relationship Contracts

## Entities

- `Vendor` is the provider business record.
- `OrganizationVendorRelationship` is the Organization-owned marketplace relationship and owns `pending`, `active`, `suspended`, `inactive`, and `removed` state plus lifecycle actors/timestamps.
- `FacilityVendor` is the many-to-many facility association. Its unique index prevents duplicate associations.

## Endpoints

- `GET /api/v1/organizations/me/vendors` lists organization vendors with pagination, search, relationship status and service-category filters.
- `GET /api/v1/organizations/me/vendors/marketplace` discovers independently registered active Vendors with pagination, search and service-category filters.
- `POST /api/v1/organizations/me/vendors/:vendorId/request` requests a relationship with an independently registered marketplace Vendor.
- `PATCH /api/v1/organizations/me/vendors/relationships/:organizationId` lets a Vendor Lead/Manager respond to a relationship request.
- `GET /api/v1/organizations/me/vendors/:vendorId` retrieves an organization-visible vendor.
- Vendor profile updates remain in the Vendor tenant through `PATCH /api/v1/vendors/me`.
- `PATCH /api/v1/organizations/me/vendors/:vendorId/status` changes relationship status and records lifecycle metadata.
- `GET /api/v1/organizations/me/vendors/facilities/:facilityId` lists vendors associated with a facility.
- `POST /api/v1/organizations/me/vendors/facilities/:facilityId/vendors/:vendorId` associates an active vendor.
- `DELETE /api/v1/organizations/me/vendors/facilities/:facilityId/vendors/:vendorId` removes the association.

Admin and Facility Manager manage organization requests and facility associations. Finance can read the directory. Vendor Lead/Manager responds to relationship requests. Organization users cannot activate a pending relationship. Every operation validates tenant context and active association where required.

## Boundaries and gaps

Vendor user authentication and invitation tokens remain in the existing User/Auth/Invitation modules. Marketplace Vendors register independently and verify their email; organization administrators do not invite marketplace vendors. Organization-to-contractor membership is reserved for the V2 contract-member workflow, so no parallel invitation system is used here. Vendor maintenance relationships are not fabricated because Service Request, PM, and Work Order do not currently expose a stable organization-vendor relationship contract. Billing remains separate.

Organizations never create Vendor tenants. Vendor tenants are independently registered through `POST /api/v1/auth/register/vendor` and become organization-visible only through `OrganizationVendorRelationship` records.
