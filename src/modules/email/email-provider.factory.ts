import type { EmailProvider } from "./interfaces/email-provider.interface.js";
import { ConfigurationError } from "./exceptions/email.exceptions.js";
import { LoggerService } from "@/infrastructure/logging/logger.service.js";
import { ResendProvider } from "./providers/resend.provider.js";

export type MailProviderName = "resend";

/** The application intentionally supports Resend as its sole mail provider. */
export function createEmailProvider(logger?: LoggerService): EmailProvider {
  const providerName = (process.env.MAIL_PROVIDER || "resend").toLowerCase();
  if (providerName !== "resend") {
    throw new ConfigurationError(
      `Unsupported MAIL_PROVIDER "${providerName}". Only MAIL_PROVIDER=resend is supported.`,
    );
  }
  return new ResendProvider(
    {
      apiKey: process.env.RESEND_API_KEY,
      defaultFromName: process.env.MAIL_FROM_NAME,
      defaultFromEmail: process.env.MAIL_FROM_EMAIL,
    },
    logger,
  );
}
