import type { QueueJob } from "../queue.job.js";

export interface SendPasswordResetEmailPayload {
  userId: string;
  email: string;
}

export class SendPasswordResetEmailJob
  implements QueueJob<SendPasswordResetEmailPayload>
{
  public static readonly NAME = "identity.password-reset";

  public readonly name = SendPasswordResetEmailJob.NAME;

  public readonly payload: SendPasswordResetEmailPayload;

  constructor(payload: SendPasswordResetEmailPayload) {
    this.payload = Object.freeze({ ...payload });
  }
}
