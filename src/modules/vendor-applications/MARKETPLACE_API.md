# Vendor Marketplace Contracts

## Eligibility

`GET /api/v1/work-orders/marketplace/open` returns only Work Orders that are:

- `fulfillmentType: marketplace`
- `status: open`
- not assigned to a Vendor
- in an Organization with an active Organization↔Vendor relationship
- in a facility explicitly associated with that Vendor
- matched to the Vendor's configured service category
- within the stricter of the Vendor's configured `coverageRadiusKm` and the Organization's active priority geographic policy

The same eligibility gate is applied when submitting an application. Frontend filtering cannot bypass it. Vendors without coordinates or a configured radius are not eligible for geographic marketplace results.

## Application lifecycle

`submitted -> under_review -> awarded | rejected` and `submitted/under_review -> withdrawn`.

- `POST /api/v1/vendor-applications` submits one application per Vendor/Work Order.
- `GET /api/v1/vendor-applications/mine` lists the current Vendor's applications.
- `GET /api/v1/vendor-applications/work-orders/:workOrderId` lets an authorized Organization review applications.
- `PATCH /api/v1/vendor-applications/:id/status` reviews or awards an application.
- `POST /api/v1/vendor-applications/:id/withdraw` withdraws a Vendor application.

Awarding updates the existing Work Order: `assignedVendorId` is set and status becomes `assigned`. No second Vendor Work Order lifecycle is created.

## Remaining dependencies

Facility coordinates are used for proximity and distance is calculated in kilometers with the shared geography utility. Policies are managed at `/api/v1/organizations/me/marketplace/geographic-policies`; a missing active policy for a Work Order priority makes that Work Order ineligible rather than applying an arbitrary fallback. Policy changes affect future eligibility evaluations only and do not rewrite existing applications or assignments. Vendor notifications should use the existing notification infrastructure; no marketplace-specific notification system was added. Vendor references in Service Requests and Preventive Maintenance remain unsupported until those modules expose stable contracts.
