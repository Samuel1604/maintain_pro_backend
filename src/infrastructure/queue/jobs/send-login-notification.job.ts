import type { QueueJob } from "../queue.job.js";

export interface SendLoginNotificationPayload {
  userId: string;
  email: string;
  sessionId: string;
  ipAddress?: string;
  userAgent?: string;
}

export class SendLoginNotificationJob
  implements QueueJob<SendLoginNotificationPayload>
{
  public static readonly NAME = "identity.login-notification";

  public readonly name = SendLoginNotificationJob.NAME;

  public readonly payload: SendLoginNotificationPayload;

  constructor(payload: SendLoginNotificationPayload) {
    this.payload = Object.freeze({ ...payload });
  }
}
