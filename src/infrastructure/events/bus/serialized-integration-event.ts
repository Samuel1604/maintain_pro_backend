export interface SerializedIntegrationEvent<TPayload = unknown> {
  eventId: string;
  name: string;
  routingKey: string;
  payload: TPayload;
  occurredAt: string;
}
