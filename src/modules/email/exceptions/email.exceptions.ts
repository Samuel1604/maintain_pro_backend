import { AppError } from "@/shared/errors/AppError.js";

export class EmailModuleException extends AppError {
  constructor(message: string, statusCode = 500, code = "EMAIL_ERROR", details?: unknown) {
    super(message, { statusCode, code, details });
  }
}

export class EmailProviderUnavailable extends EmailModuleException {
  constructor(message = "Email service provider is currently unavailable.", details?: unknown) {
    super(message, 503, "EMAIL_PROVIDER_UNAVAILABLE", details);
  }
}

export class EmailSendFailed extends EmailModuleException {
  constructor(message = "Failed to send email.", details?: unknown) {
    super(message, 500, "EMAIL_SEND_FAILED", details);
  }
}

export class InvalidRecipient extends EmailModuleException {
  constructor(message = "Invalid or missing recipient email address.", details?: unknown) {
    super(message, 400, "INVALID_RECIPIENT", details);
  }
}

export class ConfigurationError extends EmailModuleException {
  constructor(message = "Email provider configuration is invalid or incomplete.", details?: unknown) {
    super(message, 500, "EMAIL_CONFIG_ERROR", details);
  }
}
