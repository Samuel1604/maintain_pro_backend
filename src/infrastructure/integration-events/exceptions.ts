import { AppError } from "@/shared/errors/AppError.js";

export class IntegrationEventException extends AppError {
  constructor(message: string, statusCode = 500, code = "INTEGRATION_EVENT_ERROR", details?: unknown) {
    super(message, { statusCode, code, details });
  }
}

/** The broker (RabbitMQ) could not be reached or the connection dropped. */
export class IntegrationEventBrokerUnavailable extends IntegrationEventException {
  constructor(message = "Integration event broker is currently unavailable.", details?: unknown) {
    super(message, 503, "INTEGRATION_EVENT_BROKER_UNAVAILABLE", details);
  }
}

/** The broker rejected the publish (e.g. exchange/routing misconfiguration). */
export class IntegrationEventPublishFailed extends IntegrationEventException {
  constructor(message = "Failed to publish integration event.", details?: unknown) {
    super(message, 500, "INTEGRATION_EVENT_PUBLISH_FAILED", details);
  }
}

export class IntegrationEventConfigurationError extends IntegrationEventException {
  constructor(message = "Integration event broker configuration is invalid or incomplete.", details?: unknown) {
    super(message, 500, "INTEGRATION_EVENT_CONFIG_ERROR", details);
  }
}
