import { DomainEvent, type DomainEventMetadata } from "@/infrastructure/events/bus/domain-event.js";

export interface PMEventPayload {
  planId?: string;
  occurrenceId?: string;
  facilityId?: string;
  locationId?: string;
  assetId?: string;
  workOrderId?: string;
  status?: string;
  scheduledAt?: string;
}

export class PreventiveMaintenancePlanCreatedEvent extends DomainEvent<PMEventPayload> {
  constructor(payload: PMEventPayload, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenancePlanCreated", payload, undefined, undefined, metadata); }
}
export class PreventiveMaintenancePlanUpdatedEvent extends DomainEvent<PMEventPayload> {
  constructor(payload: PMEventPayload, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenancePlanUpdated", payload, undefined, undefined, metadata); }
}
export class PreventiveMaintenancePlanCancelledEvent extends DomainEvent<PMEventPayload> {
  constructor(payload: PMEventPayload, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenancePlanCancelled", payload, undefined, undefined, metadata); }
}
export class PreventiveMaintenanceOccurrenceCreatedEvent extends DomainEvent<PMEventPayload> {
  constructor(payload: PMEventPayload, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenanceOccurrenceCreated", payload, undefined, undefined, metadata); }
}
export class PreventiveMaintenanceOccurrenceApprovedEvent extends DomainEvent<PMEventPayload> {
  constructor(payload: PMEventPayload, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenanceOccurrenceApproved", payload, undefined, undefined, metadata); }
}
export class PreventiveMaintenanceOccurrenceRejectedEvent extends DomainEvent<PMEventPayload> {
  constructor(payload: PMEventPayload, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenanceOccurrenceRejected", payload, undefined, undefined, metadata); }
}
export class PreventiveMaintenanceOccurrenceCancelledEvent extends DomainEvent<PMEventPayload> {
  constructor(payload: PMEventPayload, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenanceOccurrenceCancelled", payload, undefined, undefined, metadata); }
}
export class PreventiveMaintenanceOccurrenceAssignmentChangedEvent extends DomainEvent<PMEventPayload> {
  constructor(payload: PMEventPayload, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenanceOccurrenceAssignmentChanged", payload, undefined, undefined, metadata); }
}
export class PreventiveMaintenanceOccurrenceLinkedToWorkOrderEvent extends DomainEvent<PMEventPayload> {
  constructor(payload: PMEventPayload, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenanceOccurrenceLinkedToWorkOrder", payload, undefined, undefined, metadata); }
}
export class PreventiveMaintenanceSkippedEvent extends DomainEvent<PMEventPayload & { reason?: string }> {
  constructor(payload: PMEventPayload & { reason?: string }, metadata: DomainEventMetadata = {}) { super("PreventiveMaintenanceSkipped", payload, undefined, undefined, metadata); }
}
