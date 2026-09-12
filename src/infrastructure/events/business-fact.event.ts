import { DomainEvent } from "./bus/domain-event.js";

export class BusinessFactEvent extends DomainEvent<Record<string, unknown>> {
  constructor(
    name: string,
    payload: Record<string, unknown>,
    metadata: { organizationId?: string; facilityId?: string; vendorId?: string; actorId?: string; aggregateType?: string; aggregateId?: string; correlationId?: string; causationId?: string } = {},
  ) {
    super(name, payload, undefined, undefined, metadata);
  }
}
