import type { EmailProvider } from "./interfaces/email-provider.interface.js";
import { BrevoProvider } from "./providers/brevo.provider.js";
import { SmtpProvider } from "./providers/smtp.provider.js";
import { ConfigurationError } from "./exceptions/email.exceptions.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";
import { MailforgeProvider } from "./providers/mailforge.provider.js";
import { NoopEmailProvider } from "./providers/noop.provider.js";

export type MailProviderName = "smtp" | "brevo" | "mailforge" | "noop";

/**
 * Provider registration point.
 *
 * This is the ONLY place in the application that knows which concrete
 * EmailProvider implementations exist. Business modules and the rest of
 * the application depend solely on the `EmailProvider` interface via
 * `EmailService` — they never import Nodemailer, the Brevo SDK, or any
 * provider class directly.
 *
 * MAIL_PROVIDER=smtp covers every plain-SMTP endpoint — Mailpit locally,
 * Gmail via an App Password, or Resend/Brevo/SES/Postmark's SMTP
 * interface — since they only differ by MAIL_HOST/MAIL_PORT/MAIL_SECURE/
 * MAIL_USER/MAIL_PASSWORD. Only add a new `case` here for a provider that
 * genuinely needs a non-SMTP transport (e.g. Brevo's HTTP API below). No
 * other application code needs to change either way.
 */
export function createEmailProvider(logger?: LoggerService): EmailProvider {
  const providerName = (process.env.MAIL_PROVIDER || "smtp").toLowerCase() as MailProviderName;

  switch (providerName) {
    case "noop":
      return new NoopEmailProvider();
    case "mailforge":
      return new MailforgeProvider(
        {
          baseUrl: process.env.MAILFORGE_URL,
          accountId: process.env.MAILFORGE_ACCOUNT_ID,
          apiKey: process.env.MAILFORGE_API_KEY,
          defaultFromName: process.env.MAIL_FROM_NAME,
          defaultFromEmail: process.env.MAIL_FROM_EMAIL,
        },
        logger,
      );
    case "smtp":
      return new SmtpProvider(
        {
          host: process.env.MAIL_HOST,
          port: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : undefined,
          secure: process.env.MAIL_SECURE ? process.env.MAIL_SECURE.toLowerCase() === "true" : undefined,
          user: process.env.MAIL_USER,
          password: process.env.MAIL_PASSWORD,
          defaultFromName: process.env.MAIL_FROM_NAME,
          defaultFromEmail: process.env.MAIL_FROM_EMAIL,
        },
        logger,
      );

    case "brevo":
      return new BrevoProvider(
        {
          apiKey: process.env.BREVO_API_KEY,
          defaultFromName: process.env.MAIL_FROM_NAME,
          defaultFromEmail: process.env.MAIL_FROM_EMAIL,
        },
        logger,
      );

    default:
      throw new ConfigurationError(
        `Unsupported MAIL_PROVIDER "${providerName}". Supported values: smtp, brevo, mailforge.`,
      );
  }
}
