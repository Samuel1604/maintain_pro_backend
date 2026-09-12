import type { EmailProvider } from "../interfaces/email-provider.interface.js";
import { randomUUID } from "node:crypto";
import type { Recipient, SendEmailPayload, SendEmailResult } from "../types/email.types.js";
import { ConfigurationError, EmailProviderUnavailable, EmailSendFailed, InvalidRecipient } from "../exceptions/email.exceptions.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";

export interface MailforgeProviderOptions {
  baseUrl?: string;
  accountId?: string;
  apiKey?: string;
  defaultFromName?: string;
  defaultFromEmail?: string;
}

export class MailforgeProvider implements EmailProvider {
  public readonly providerName = "Mailforge";
  private readonly baseUrl: string;
  private readonly accountId: string;
  private readonly apiKey: string;
  private readonly defaultFrom: Recipient;

  constructor(options: MailforgeProviderOptions, private readonly logger?: LoggerService) {
    this.baseUrl = (options.baseUrl || process.env.MAILFORGE_URL || "").replace(/\/$/, "");
    this.accountId = options.accountId || process.env.MAILFORGE_ACCOUNT_ID || "";
    this.apiKey = options.apiKey || process.env.MAILFORGE_API_KEY || "";
    if (!this.baseUrl || !this.accountId || !this.apiKey) {
      throw new ConfigurationError("MAILFORGE_URL, MAILFORGE_ACCOUNT_ID, and MAILFORGE_API_KEY are required.");
    }
    this.defaultFrom = {
      name: options.defaultFromName || process.env.MAIL_FROM_NAME || "MaintainPro",
      email: options.defaultFromEmail || process.env.MAIL_FROM_EMAIL || "noreply@maintainpro.com",
    };
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const recipients = this.normalizeRecipients(payload.to);
    if (recipients.length === 0) throw new InvalidRecipient("At least one recipient email address is required.");
    if (!payload.text && !payload.html) throw new EmailSendFailed("Email text or HTML content is required.");

    const idempotencyKey = payload.metadata?.eventId || payload.correlationId || `maintainpro-${randomUUID()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v1/accounts/${encodeURIComponent(this.accountId)}/emails`, {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          to: recipients.map((recipient) => this.formatAddress(recipient)),
          from: this.formatAddress(payload.from || this.defaultFrom),
          replyTo: payload.replyTo ? this.formatAddress(payload.replyTo) : undefined,
          subject: payload.subject,
          text: payload.text,
          html: payload.html,
          metadata: { ...payload.metadata, correlationId: payload.correlationId },
        }),
      });
    } catch (error) {
      throw new EmailProviderUnavailable(`Mailforge request failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      clearTimeout(timeout);
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = body?.error?.code || `Mailforge returned HTTP ${response.status}`;
      if (response.status >= 500 || response.status === 429) throw new EmailProviderUnavailable(message);
      throw new EmailSendFailed(message);
    }
    const messageId = body.deliveryId;
    if (!messageId) throw new EmailSendFailed("Mailforge did not return a delivery ID.");
    this.logger?.info("Email queued via Mailforge", { provider: this.providerName, deliveryId: messageId, correlationId: payload.correlationId });
    return { messageId, provider: this.providerName, acceptedRecipients: recipients.map((recipient) => recipient.email) };
  }

  private normalizeRecipients(value: SendEmailPayload["to"]): Recipient[] {
    const values = Array.isArray(value) ? value : [value];
    return values.flatMap((item) => typeof item === "string" ? [{ email: item }] : [item]).filter((item) => item.email.trim() !== "");
  }

  private formatAddress(value: Recipient): string { return value.name ? `${value.name} <${value.email}>` : value.email; }
}
