# Marketplace Geographic Policy

Organization Admin and Facility Manager users may manage priority-based geographic thresholds:

- `GET /api/v1/organizations/me/marketplace/geographic-policies`
- `POST /api/v1/organizations/me/marketplace/geographic-policies`
- `GET /api/v1/organizations/me/marketplace/geographic-policies/:id`
- `PATCH /api/v1/organizations/me/marketplace/geographic-policies/:id`
- `POST /api/v1/organizations/me/marketplace/geographic-policies/:id/activate`
- `POST /api/v1/organizations/me/marketplace/geographic-policies/:id/deactivate`

Each policy contains `priority`, `maxDistanceKm`, `enabled`, organization scope, and audit timestamps. Active policies are unique per organization and priority. Negative distances are rejected. There is no hardcoded platform fallback in the current MVP: missing policy means marketplace ineligible.
