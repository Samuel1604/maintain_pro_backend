import nodemailer, { type Transporter } from "nodemailer";
import type Mail from "nodemailer/lib/mailer/index.js";
import type { EmailProvider } from "../interfaces/email-provider.interface.js";
import type { SendEmailPayload, SendEmailResult, Recipient, EmailAttachment } from "../types/email.types.js";
import {
  ConfigurationError,
  EmailProviderUnavailable,
  EmailSendFailed,
  InvalidRecipient,
} from "../exceptions/email.exceptions.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";

/**
 * SmtpProvider
 *
 * Infrastructure-only implementation of the EmailProvider interface backed
 * by Nodemailer over plain SMTP. This is the ONE generic SMTP transport for
 * the application — it is not written against any particular vendor.
 * Business modules never see Nodemailer or any SMTP detail; they only ever
 * depend on `EmailProvider` via `EmailService`.
 *
 * Every environment (local Mailpit, Gmail via an App Password, Resend SMTP,
 * Brevo SMTP, SES SMTP, Postmark SMTP, ...) is just a different set of
 * MAIL_HOST / MAIL_PORT / MAIL_SECURE / MAIL_USER / MAIL_PASSWORD values.
 * Switching providers is a config change only — never a code change:
 *   - Mailpit (dev):     MAIL_HOST=127.0.0.1 MAIL_PORT=1025, no credentials
 *   - Gmail:             MAIL_HOST=smtp.gmail.com MAIL_PORT=587, App Password
 *   - Resend/Brevo/SES/Postmark SMTP: their documented host/port + API-key-as-password
 *
 * Authentication is OPTIONAL: MAIL_USER/MAIL_PASSWORD are only wired into
 * the transporter when both are present. Mailpit (and most local SMTP
 * sinks) accept unauthenticated connections, so this provider does not
 * require credentials to construct or to send.
 */
export interface SmtpProviderOptions {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  defaultFromName?: string;
  defaultFromEmail?: string;
}

export class SmtpProvider implements EmailProvider {
  public readonly providerName = "SMTP";
  private readonly transporter: Transporter;
  private readonly defaultFrom: Recipient;
  private readonly host: string;
  private readonly port: number;

  constructor(
    options: SmtpProviderOptions,
    private readonly logger?: LoggerService,
  ) {
    const host = options.host || process.env.MAIL_HOST;
    const port = options.port ?? Number(process.env.MAIL_PORT ?? 587);
    const secure = options.secure ?? this.parseBoolean(process.env.MAIL_SECURE, false);
    const user = options.user || process.env.MAIL_USER || undefined;
    const password = options.password || process.env.MAIL_PASSWORD || undefined;

    if (!host) {
      throw new ConfigurationError("MAIL_HOST is not configured in environment variables.");
    }

    // Auth is optional — Mailpit and many local/dev SMTP sinks accept
    // unauthenticated connections. Only wire up `auth` when both a user
    // and password are actually supplied; never send a half-filled
    // credential pair to Nodemailer.
    const hasCredentials = Boolean(user && password);
    if ((user && !password) || (!user && password)) {
      throw new ConfigurationError(
        "Incomplete SMTP credentials: both MAIL_USER and MAIL_PASSWORD must be set together, or neither (for unauthenticated SMTP such as Mailpit).",
      );
    }

    const defaultFromEmail = options.defaultFromEmail || process.env.MAIL_FROM_EMAIL;
    const defaultFromName = options.defaultFromName || process.env.MAIL_FROM_NAME || "MaintainPro";

    if (!defaultFromEmail) {
      throw new ConfigurationError("MAIL_FROM_EMAIL is not configured in environment variables.");
    }

    this.defaultFrom = {
      email: defaultFromEmail,
      name: defaultFromName,
    };

    this.host = host;
    this.port = port;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(hasCredentials && { auth: { user: user!, pass: password! } }),
    });
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const recipients = this.normalizeRecipients(payload.to);
    if (recipients.length === 0) {
      throw new InvalidRecipient("At least one recipient email address is required.");
    }

    const from = payload.from
      ? this.formatAddress(payload.from)
      : this.formatAddress(this.defaultFrom);

    const to = recipients.map((r) => this.formatAddress(r));

    const logContext = {
      provider: this.providerName,
      host: this.host,
      port: this.port,
      recipient: recipients.map((r) => r.email),
      subject: payload.subject,
      correlationId: payload.correlationId,
    };

    const startedAt = Date.now();

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject: payload.subject,
        ...(payload.html && { html: payload.html }),
        ...(payload.text && { text: payload.text }),
        ...(payload.replyTo && { replyTo: this.formatAddress(payload.replyTo) }),
        ...(payload.attachments && { attachments: this.mapAttachments(payload.attachments) }),
      });

      const responseTimeMs = Date.now() - startedAt;

      const rejectedRecipients = (info.rejected || [])
        .map((r: string | Mail.Address) => typeof r === "string" ? r : r.address)
        .filter((email): email is string => typeof email === "string" && email.length > 0);
      const acceptedRecipients = (info.accepted || [])
        .map((r: string | Mail.Address) => typeof r === "string" ? r : r.address)
        .filter((email): email is string => typeof email === "string" && email.length > 0);
      const fallbackAcceptedRecipients = recipients
        .map((recipient) => recipient.email)
        .filter((email): email is string => typeof email === "string" && email.length > 0);

      this.logger?.info("Email sent", {
        ...logContext,
        messageId: info.messageId,
        success: true,
        responseTimeMs,
        ...(rejectedRecipients.length > 0 && { rejectedRecipients }),
      });

      return {
        messageId: info.messageId || `smtp-${Date.now()}`,
        provider: this.providerName,
        acceptedRecipients: acceptedRecipients.length > 0
          ? acceptedRecipients
          : fallbackAcceptedRecipients,
        ...(rejectedRecipients.length > 0 && { rejectedRecipients }),
      };
    } catch (error: unknown) {
      const responseTimeMs = Date.now() - startedAt;

      this.logger?.error("Email send failed", {
        ...logContext,
        success: false,
        responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
      });

      throw this.mapError(error);
    }
  }

  /**
   * Maps Nodemailer/SMTP errors into application-level email exceptions.
   * Nodemailer's raw error objects and messages are never rethrown or
   * exposed outside this provider.
   */
  private mapError(error: unknown): Error {
    const code = error && typeof error === "object" && "code" in error ? (error as { code?: string }).code : undefined;
    const responseCode =
      error && typeof error === "object" && "responseCode" in error
        ? (error as { responseCode?: number }).responseCode
        : undefined;

    switch (code) {
      case "EAUTH":
      case "ENOAUTH":
        return new ConfigurationError(
          "SMTP authentication failed. Verify MAIL_USER and MAIL_PASSWORD.",
          { code },
        );
      case "ECONFIG":
        return new ConfigurationError("SMTP configuration is invalid.", { code });
      case "ECONNECTION":
      case "ETIMEDOUT":
      case "ESOCKET":
      case "EDNS":
      case "ETLS":
        return new EmailProviderUnavailable(
          "SMTP service is currently unreachable or timing out.",
          { code },
        );
      case "EENVELOPE":
        return new InvalidRecipient(
          "SMTP server rejected the message envelope (invalid sender or recipients).",
          { code },
        );
      default:
        break;
    }

    if (responseCode && responseCode >= 500) {
      return new EmailProviderUnavailable("SMTP server returned a server error.", { responseCode });
    }
    if (responseCode === 421 || responseCode === 450 || responseCode === 451) {
      return new EmailProviderUnavailable("SMTP server is temporarily unavailable.", { responseCode });
    }

    return new EmailSendFailed(
      `Failed to send email via SMTP: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  private formatAddress(recipient: Recipient): string {
    return recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email;
  }

  private mapAttachments(attachments: EmailAttachment[]) {
    return attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      ...(a.contentType && { contentType: a.contentType }),
    }));
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

  private parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) return fallback;
    return value.toLowerCase() === "true";
  }
}
