# MaintainPro Event Catalog

This is the operating index for every event family currently defined or published by the backend. An event is a fact about a completed or requested change. The event envelope carries `eventId`, `eventName`, `organizationId`, `facilityId`, `vendorId`, `actorId`, `aggregateType`, `aggregateId`, `correlationId`, `causationId`, `version`, and the event payload.

## Processing contract

1. A domain service creates an event after its state change is valid.
2. `QueuedEventBus` publishes it to the `domain-events` BullMQ queue.
3. `DomainEventWorker` performs durable `eventId` idempotency and rehydrates the event.
4. `EventRegistry` invokes registered listeners.
5. Listener failures reject the job, allowing retry and eventual DLQ capture.

Events with no facility or vendor scope are intentionally organization-wide or identity/system events. Consumers must not infer scope from the current user; they must use the event envelope and verify authorization against the referenced aggregate.

## Identity events

| Event | Publisher | Scope | Reactions |
|---|---|---|---|
| `identity.organization.registered` | Auth service | organization | audit, email/verification flows |
| `identity.vendor.registered` | Auth service | vendor | audit, email verification, onboarding flows |
| `identity.user.registered` | User service | organization or vendor | audit |
| `identity.user.logged_in` | Auth/session service | actor + organization/vendor when known | audit, login notification job |
| `identity.user.login_failed` | Auth service | actor/email, organization when known | audit, security monitoring |
| `identity.user.logged_out` | Session service | actor + organization/vendor | audit |
| `identity.user.locked_out` | Lockout service | actor + organization/vendor | audit, security email |
| `identity.session.created` | Session service | actor + organization/vendor | audit |
| `identity.session.revoked` | Session service | actor + organization/vendor | audit |
| `identity.session.expired` | Session service | actor + organization/vendor | audit |
| `identity.security.alert_raised` | Session/security services | organization/vendor when known | audit, security alert handling |
| `identity.otp.requested` | Auth/user services | actor + organization/vendor | email delivery |
| `identity.otp.verified` | Auth/user services | actor + organization/vendor | audit |
| `identity.verification_link.requested` | Auth service | organization/vendor when known | email delivery |
| `identity.email.verified` | Auth/user services | actor + organization/vendor | audit |
| `identity.email.changed` | User service | actor + organization/vendor | audit, security email |
| `identity.password.reset_requested` | User service | actor/email + organization/vendor | password reset email |
| `identity.password.reset_completed` | User service | actor + organization/vendor | audit |
| `identity.password.changed` | User service | actor + organization/vendor | audit, security email |
| `identity.invitation.created` | Invitation service | organization or vendor team | audit, invitation delivery when explicitly queued |
| `identity.invitation.accepted` | Invitation service | organization or vendor team | audit |
| `identity.invitation.expired` | Invitation lifecycle | organization or vendor team | audit |

### Vendor identity boundary

MaintainPro currently supports one marketplace Vendor onboarding path. A Vendor registers independently through the same identity flow as an Organization, verifies its email, and receives its own Vendor portal and tenant identity. `identity.vendor.registered`, verification, OTP, session, and password events describe that registered Vendor lifecycle.

An organization inviting an external contractor to work under a private contract is a different concept. That person is an organization-bound member, not a marketplace Vendor, must not appear in marketplace discovery, and must not be represented by `vendorId`. Contract-based organization/vendor-member onboarding is intentionally deferred to V2. Current invitation events only cover organization users and members of an already registered Vendor tenant.

## Facility and location events

| Event | Publisher | Required scope | Reactions |
|---|---|---|---|
| `facility.created` | Facility service | organization + facility | audit, relationship refresh |
| `facility.updated` | Facility service | organization + facility | audit |
| `facility.deactivated` | Facility service | organization + facility | audit, lifecycle handling |
| `facility.deleted` | Facility service | organization + facility | audit, lifecycle handling |
| `LocationCreated` | Location service | organization + facility | audit, relationship refresh |

## Work orders and service requests

| Event | Publisher | Required scope | Reactions |
|---|---|---|---|
| `WorkOrderCreated` | Work Order service | organization + facility; vendor when assigned | audit, notifications, marketplace reactions |
| `WorkOrderStatusChanged` | Work Order service | organization + facility; vendor when assigned | audit, notifications, SLA tracking |
| `WorkOrderAssigned` | Work Order service | organization + facility; vendor when assigned | audit, notifications |
| `ServiceRequestCreated` | Service Request service | organization + facility | audit, approval notifications |
| `ServiceRequestApproved` | Service Request service | organization + facility; vendor when marketplace fulfillment is chosen | audit, work-order creation |
| `ServiceRequestRejected` | Service Request service | organization + facility | audit, requester notification |

## Inventory and preventive maintenance

| Event | Publisher | Required scope | Reactions |
|---|---|---|---|
| `StockReceived` | Inventory event service | organization + facility/location | audit, low-stock recalculation |
| `StockReserved` | Inventory event service | organization + facility/location; work order when present | audit |
| `ReservationReleased` | Inventory event service | organization + facility/location | audit |
| `StockIssued` | Inventory event service | organization + facility/location; work order when present | audit |
| `StockConsumed` | Inventory event service | organization + facility/location; work order when present | audit |
| `StockReturned` | Inventory event service | organization + facility/location | audit |
| `StockAdjusted` | Inventory event service | organization + facility/location | audit |
| `StockTransferred` | Inventory event service | organization + source/destination facilities or locations | audit |
| `LowStockDetected` | Inventory event service | organization + facility/location | notification, audit |
| `PreventiveMaintenancePlanCreated` | PM service | organization + facility/location/asset when known | audit, scheduling |
| `PreventiveMaintenancePlanUpdated` | PM service | organization + facility/location/asset when known | audit, scheduling |
| `PreventiveMaintenancePlanCancelled` | PM service | organization + facility/location/asset when known | audit |
| `PreventiveMaintenanceOccurrenceCreated` | PM service | organization + facility/location/asset | audit |
| `PreventiveMaintenanceOccurrenceApproved` | PM service | organization + facility/location/asset | work-order generation, audit |
| `PreventiveMaintenanceOccurrenceRejected` | PM service | organization + facility/location/asset | audit, notification |
| `PreventiveMaintenanceOccurrenceCancelled` | PM service | organization + facility/location/asset | audit |
| `PreventiveMaintenanceOccurrenceAssignmentChanged` | PM service | organization + facility/location/asset; vendor when assigned | audit, notification |
| `PreventiveMaintenanceOccurrenceLinkedToWorkOrder` | PM service | organization + facility/location/asset | audit |

## Procurement, vendors, contracts, and billing

| Event | Publisher | Required scope | Reactions |
|---|---|---|---|
| `ApplicationSubmitted` | Vendor application service | organization + work order facility; vendor | audit, procurement notification |
| `VendorApplicationStatusChanged` | Vendor application service | organization + facility; vendor | audit, procurement notification |
| `QuotationSubmitted` | Quotation service | organization + facility; vendor | audit, procurement notification |
| `QuotationRevisionCreated` | Quotation service | organization + facility; vendor | audit |
| `AwardCreated` | Contract award service | organization + facility; vendor | audit, contract notification |
| `AwardActivated` | Contract award service | organization + facility; vendor | audit |
| `AwardTerminated` | Contract award service | organization + facility; vendor | audit |
| `SlaProposed` | SLA service | organization + facility; vendor | audit |
| `ProcurementNotificationRequested` | Procurement event service | organization + facility when known; vendor for vendor audience | notification |
| `billing.subscription.created` | Billing service | organization | audit, billing notification |
| `billing.subscription.activated` | Billing service | organization | audit, billing notification |
| `billing.subscription.upgraded` | Billing service | organization | audit, billing notification |
| `billing.subscription.downgraded` | Billing service | organization | audit, billing notification |
| `billing.subscription.cancelled` | Billing service | organization | audit, billing notification |
| `billing.subscription.expired` | Billing service | organization | audit, billing notification |

## Scope and review rules

- Every new event must be added to this catalog before merge.
- Organization-owned events must include `organizationId` in metadata or a payload fallback field.
- Facility-owned events must include `facilityId` and organization scope.
- Vendor-owned events must include `vendorId`; organization scope is included when the event occurs inside an organization/vendor relationship.
- Cross-tenant consumers must validate both sides of a relationship before acting.
- Event payloads must not contain passwords, tokens, payment credentials, or full secrets.
- A duplicate event must be safe through durable `eventId` idempotency.
- A queue-backed reaction must preserve all scope and trace identifiers in its job envelope and DLQ record.

## Known migration work

Some older identity and business-fact publishers still rely on payload fallback rather than explicitly passing `facilityId` or `vendorId` in metadata. The envelope supports this for compatibility. Each publisher should be converted to explicit metadata as its module is next changed, and tests should assert scope for every event family above.
