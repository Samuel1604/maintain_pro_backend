import type { Logger } from "./logger.interface.js";

export class ConsoleLogger implements Logger {
  info(message: string, metadata?: unknown): void {
    console.info(this.format("info", message, metadata));
  }

  warn(message: string, metadata?: unknown): void {
    console.warn(this.format("warn", message, metadata));
  }

  error(message: string, metadata?: unknown): void {
    console.error(this.format("error", message, metadata));
  }

  debug(message: string, metadata?: unknown): void {
    console.debug(this.format("debug", message, metadata));
  }

  private format(level: string, message: string, metadata?: unknown): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && typeof metadata === "object"
        ? { metadata: redact(metadata) }
        : metadata === undefined
          ? {}
          : { metadata }),
    });
  }
}

const SENSITIVE_KEY = /(password|passcode|token|secret|cookie|authorization|api[-_]?key|cvv|card(number)?)/i;

function redact(value: object): unknown {
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactValue(item),
    ]),
  );
}

function redactValue(value: unknown): unknown {
  if (value && typeof value === "object") return redact(value);
  return value;
}
