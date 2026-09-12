import { BrevoClient } from "@getbrevo/brevo";
import type { EmailProvider } from "../interfaces/email-provider.interface.js";
import type { SendEmailPayload, SendEmailResult, Recipient } from "../types/email.types.js";
import {
  ConfigurationError,
  EmailProviderUnavailable,
  EmailSendFailed,
  InvalidRecipient,
} from "../exceptions/email.exceptions.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";

export interface BrevoProviderOptions {
  apiKey?: string;
  defaultFromName?: string;
  defaultFromEmail?: string;
}
export class BrevoProvider implements EmailProvider {
  public readonly providerName = "Brevo";
  private readonly client: BrevoClient;
  private readonly defaultFrom: Recipient;

  constructor(
    options: BrevoProviderOptions,
    private readonly logger?: LoggerService,
  ) {
    const apiKey = options.apiKey || process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new ConfigurationError("BREVO_API_KEY is not configured in environment variables.");
    }

    const defaultFromEmail = options.defaultFromEmail || process.env.MAIL_FROM_EMAIL || "noreply@maintainpro.com";
    const defaultFromName = options.defaultFromName || process.env.MAIL_FROM_NAME || "MaintainPro";

    this.defaultFrom = {
      email: defaultFromEmail,
      name: defaultFromName,
    };

    this.client = new BrevoClient({ apiKey });
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const recipients = this.normalizeRecipients(payload.to);
    if (recipients.length === 0) {
      throw new InvalidRecipient("At least one recipient email address is required.");
    }

    const sender = payload.from
      ? { email: payload.from.email, name: payload.from.name }
      : { email: this.defaultFrom.email, name: this.defaultFrom.name };

    const to = recipients.map((r) => ({ email: r.email, name: r.name }));

    try {
      const response = await this.client.transactionalEmails.sendTransacEmail({
        sender,
        to,
        subject: payload.subject,
        ...(payload.html && { htmlContent: payload.html }),
        ...(payload.text && { textContent: payload.text }),
        ...(payload.replyTo && { replyTo: { email: payload.replyTo.email, name: payload.replyTo.name } }),
        ...(payload.tags && { tags: payload.tags }),
        ...(payload.metadata && { params: payload.metadata }),
      });

      const messageId = response.messageId || `brevo-${Date.now()}`;

      this.logger?.info("Email successfully sent via Brevo", {
        provider: this.providerName,
        messageId,
        recipients: recipients.map((r) => r.email),
        correlationId: payload.correlationId,
      });

      return {
        messageId,
        provider: this.providerName,
        acceptedRecipients: recipients.map((r) => r.email),
      };
    } catch (error: unknown) {
      this.logger?.error("Brevo email send failed", {
        provider: this.providerName,
        error: error instanceof Error ? error.message : String(error),
        recipients: recipients.map((r) => r.email),
        correlationId: payload.correlationId,
      });

      if (error && typeof error === "object" && "statusCode" in error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 401 || status === 403) {
          throw new ConfigurationError("Brevo API key is invalid or unauthorized.", error);
        }
        if (status && status >= 500) {
          throw new EmailProviderUnavailable("Brevo API service is currently down or failing.", error);
        }
      }

      throw new EmailSendFailed(
        `Failed to send email via Brevo: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  private normalizeRecipients(to: Recipient | Recipient[] | string): Recipient[] {
    if (typeof to === "string") {
      return [{ email: to }];
    }
    if (Array.isArray(to)) {
      return to.map((item) => (typeof item === "string" ? { email: item } : item));
    }
    return [to];
  }
}
