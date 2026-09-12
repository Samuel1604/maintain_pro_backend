import { DomainEvent, type DomainEventMetadata } from "./domain-event.js";

export interface SerializedDomainEvent<TPayload = unknown> {
  eventId: string;
  name: string;
  payload: TPayload;
  occurredAt: string;
  metadata?: DomainEventMetadata;
}

export function serializeDomainEvent<TEvent extends DomainEvent>(event: TEvent): SerializedDomainEvent {
  return {
    eventId: event.eventId,
    name: event.name,
    payload: event.payload,
    occurredAt: event.occurredAt.toISOString(),
    metadata: {
      organizationId: event.organizationId,
      facilityId: event.facilityId,
      vendorId: event.vendorId,
      actorId: event.actorId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      correlationId: event.correlationId,
      causationId: event.causationId,
      version: event.version,
    },
  };
}

export class RehydratedDomainEvent<TPayload = unknown> extends DomainEvent<TPayload> {
  constructor(serialized: SerializedDomainEvent<TPayload>) {
    super(serialized.name, serialized.payload, new Date(serialized.occurredAt), serialized.eventId, serialized.metadata);
  }
}
