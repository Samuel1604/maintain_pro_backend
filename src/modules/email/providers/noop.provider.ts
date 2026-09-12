import type { EmailProvider } from "../interfaces/email-provider.interface.js";
import type { SendEmailPayload, SendEmailResult } from "../types/email.types.js";

export class NoopEmailProvider implements EmailProvider {
  readonly providerName = "NOOP";
  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    return { messageId: `test-${Date.now()}`, provider: this.providerName, acceptedRecipients: recipients.map((recipient) => typeof recipient === "string" ? recipient : recipient.email) };
  }
}
