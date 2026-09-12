// Future-Ready Queue Integration Placeholder
// Enable async email queuing when Redis/BullMQ worker pipeline is active

import type { SendEmailPayload } from "../types/email.types.js";

export interface EmailQueueJobPayload {
  payload: SendEmailPayload;
  attempts: number;
  scheduledAt: string;
}

export class EmailQueuePlaceholder {
  async enqueueEmailJob(_jobPayload: EmailQueueJobPayload): Promise<void> {
    // Placeholder: Connect to queue dispatcher when background queue worker is enabled
  }
}
