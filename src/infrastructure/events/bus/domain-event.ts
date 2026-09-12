import { randomUUID } from "node:crypto";

export interface DomainEventMetadata {
  organizationId?: string;
  facilityId?: string;
  vendorId?: string;
  actorId?: string;
  aggregateType?: string;
  aggregateId?: string;
  correlationId?: string;
  causationId?: string;
  version?: number;
}

export abstract class DomainEvent<TPayload = unknown> {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly organizationId?: string;
  public readonly facilityId?: string;
  public readonly vendorId?: string;
  public readonly actorId?: string;
  public readonly aggregateType?: string;
  public readonly aggregateId?: string;
  public readonly correlationId: string;
  public readonly causationId?: string;
  public readonly version: number;


  protected constructor(
    public readonly name: string,
    public readonly payload: TPayload,
    occurredAt?: Date,
    eventId?: string,
    metadata: DomainEventMetadata = {},
  ) {
    this.eventId = eventId ?? randomUUID();
    this.occurredAt = occurredAt ?? new Date();
    this.organizationId = metadata.organizationId ?? this.payloadContext("organizationId");
    this.facilityId = metadata.facilityId ?? this.payloadContext("facilityId");
    this.vendorId = metadata.vendorId ?? this.payloadContext("vendorId", "assignedVendorId", "selectedVendorId");
    this.actorId = metadata.actorId ?? this.payloadContext("actorId", "createdBy", "updatedBy", "performedBy");
    this.aggregateType = metadata.aggregateType;
    this.aggregateId = metadata.aggregateId;
    this.correlationId = metadata.correlationId ?? this.eventId;
    this.causationId = metadata.causationId;
    this.version = metadata.version ?? 1;
  }

  private payloadContext(...keys: string[]): string | undefined {
    if (!this.payload || typeof this.payload !== "object") return undefined;
    const payload = this.payload as Record<string, unknown>;
    const value = keys.map((key) => payload[key]).find((candidate): candidate is string => typeof candidate === "string");
    return value;
  }
}
