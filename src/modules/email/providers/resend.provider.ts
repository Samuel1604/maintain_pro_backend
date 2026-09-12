import { Resend } from "resend";
import type { EmailProvider } from "../interfaces/email-provider.interface.js";
import type { SendEmailPayload, SendEmailResult, Recipient } from "../types/email.types.js";
import {
  ConfigurationError,
  EmailProviderUnavailable,
  EmailSendFailed,
  InvalidRecipient,
} from "../exceptions/email.exceptions.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";

export interface ResendProviderOptions {
  apiKey?: string;
  defaultFromName?: string;
  defaultFromEmail?: string;
}

export class ResendProvider implements EmailProvider {
  public readonly providerName = "Resend";
  private readonly client: Resend;
  private readonly defaultFrom: Recipient;

  constructor(
    options: ResendProviderOptions,
    private readonly logger?: LoggerService,
  ) {
    const apiKey = options.apiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new ConfigurationError("RESEND_API_KEY is not configured in environment variables.");
    }

    const defaultFromEmail = options.defaultFromEmail || process.env.MAIL_FROM_EMAIL || "noreply@maintainpro.com";
    const defaultFromName = options.defaultFromName || process.env.MAIL_FROM_NAME || "MaintainPro";

    this.defaultFrom = {
      email: defaultFromEmail,
      name: defaultFromName,
    };

    this.client = new Resend(apiKey);
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const recipients = this.normalizeRecipients(payload.to);
    if (recipients.length === 0) {
      throw new InvalidRecipient("At least one recipient email address is required.");
    }

    const sender = payload.from
      ? this.formatAddress(payload.from)
      : this.formatAddress(this.defaultFrom);

    try {
      const response = await this.client.emails.send({
        from: sender,
        to: recipients.map((r) => r.email),
        subject: payload.subject,
        ...(payload.html ? { html: payload.html } : { text: payload.text ?? "" }),
        ...(payload.replyTo && { replyTo: payload.replyTo.email }),
        ...(payload.tags && {
          tags: payload.tags.map((tag) => ({ name: tag, value: tag })),
        }),
        ...(payload.attachments && {
          attachments: payload.attachments.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType,
          })),
        }),
      });

      if (response.error) {
        throw this.mapErrorResponse(response.error, recipients, payload.correlationId);
      }

      const messageId = response.data?.id || `resend-${Date.now()}`;

      this.logger?.info("Email successfully sent via Resend", {
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
      if (
        error instanceof ConfigurationError ||
        error instanceof EmailProviderUnavailable ||
        error instanceof EmailSendFailed
      ) {
        throw error;
      }

      this.logger?.error("Resend email send failed", {
        provider: this.providerName,
        error: error instanceof Error ? error.message : String(error),
        recipients: recipients.map((r) => r.email),
        correlationId: payload.correlationId,
      });

      throw new EmailSendFailed(
        `Failed to send email via Resend: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  private mapErrorResponse(
    error: { message: string; statusCode: number | null; name: string },
    recipients: Recipient[],
    correlationId?: string,
  ): Error {
    this.logger?.error("Resend email send failed", {
      provider: this.providerName,
      error: error.message,
      errorName: error.name,
      recipients: recipients.map((r) => r.email),
      correlationId,
    });

    if (error.name === "missing_api_key" || error.name === "invalid_api_key" || error.name === "restricted_api_key") {
      return new ConfigurationError(`Resend API key is invalid or unauthorized: ${error.message}`, error);
    }

    if (error.name === "invalid_from_address") {
      return new ConfigurationError(`Resend sender address is not verified: ${error.message}`, error);
    }

    if (
      error.name === "rate_limit_exceeded" ||
      error.name === "monthly_quota_exceeded" ||
      error.name === "daily_quota_exceeded" ||
      error.name === "internal_server_error" ||
      (error.statusCode != null && error.statusCode >= 500)
    ) {
      return new EmailProviderUnavailable(`Resend API service is currently unavailable: ${error.message}`, error);
    }

    return new EmailSendFailed(`Failed to send email via Resend: ${error.message}`, error);
  }

  private formatAddress(recipient: Recipient): string {
    return recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email;
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
