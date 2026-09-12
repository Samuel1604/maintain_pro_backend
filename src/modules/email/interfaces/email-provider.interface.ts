import type { SendEmailPayload, SendEmailResult } from "../types/email.types.js";

export interface EmailProvider {
  readonly providerName: string;
  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;
}
