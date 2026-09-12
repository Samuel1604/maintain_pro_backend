import type { QueueJob } from "../queue.job.js";

export interface SendEmailJobPayload {
  to: { email: string; name?: string } | string;
  subject: string;
  html?: string;
  text?: string;
  tags?: string[];
  correlationId?: string;
}

export class SendEmailJob implements QueueJob<SendEmailJobPayload> {
  public static readonly NAME = "email.send";
  public readonly name = SendEmailJob.NAME;
  public readonly payload: SendEmailJobPayload;

  constructor(payload: SendEmailJobPayload) {
    this.payload = Object.freeze({ ...payload });
  }
}
