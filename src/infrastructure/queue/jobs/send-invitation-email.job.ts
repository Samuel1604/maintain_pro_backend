import type { QueueJob } from "../queue.job.js";

export interface SendInvitationEmailPayload {
  invitationId: string;
  email: string;
  role: string;
  invitedBy: string;
  organizationId?: string;
  vendorId?: string;
}

export class SendInvitationEmailJob
  implements QueueJob<SendInvitationEmailPayload>
{
  public static readonly NAME = "invitation.send";

  public readonly name = SendInvitationEmailJob.NAME;

  public readonly payload: SendInvitationEmailPayload;

  constructor(payload: SendInvitationEmailPayload) {
    this.payload = Object.freeze({ ...payload });
  }
}
