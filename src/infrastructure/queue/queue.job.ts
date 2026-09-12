export interface QueueJob<T = unknown> {
  name: string;
  eventId?: string;
  eventName?: string;
  organizationId?: string;
  facilityId?: string;
  vendorId?: string;
  causationId?: string;
  priority?: number;
  /** Logical event name for observability; defaults to the queue job name. */
  payload: T;
  queueName?: string;
  jobId?: string;
  correlationId?: string;
  timeoutMs?: number;
}
