import { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import { FacilityEvents } from "./facility.events.js";
import type {
  FacilityCreatedPayload,
  FacilityUpdatedPayload,
  FacilityDeactivatedPayload,
  FacilityDeletedPayload,
} from "./facility.event-payloads.js";

export class FacilityCreatedEvent extends DomainEvent<FacilityCreatedPayload> {
  constructor(payload: FacilityCreatedPayload) {
    super(FacilityEvents.FACILITY_CREATED, payload);
  }
}

export class FacilityUpdatedEvent extends DomainEvent<FacilityUpdatedPayload> {
  constructor(payload: FacilityUpdatedPayload) {
    super(FacilityEvents.FACILITY_UPDATED, payload);
  }
}

export class FacilityDeactivatedEvent extends DomainEvent<FacilityDeactivatedPayload> {
  constructor(payload: FacilityDeactivatedPayload) {
    super(FacilityEvents.FACILITY_DEACTIVATED, payload);
  }
}

export class FacilityDeletedEvent extends DomainEvent<FacilityDeletedPayload> {
  constructor(payload: FacilityDeletedPayload) {
    super(FacilityEvents.FACILITY_DELETED, payload);
  }
}
