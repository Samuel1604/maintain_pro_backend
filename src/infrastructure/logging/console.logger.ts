import type { Logger } from "./logger.interface.js";

export class ConsoleLogger implements Logger {
  info(message: string, metadata?: unknown): void {
    console.info(`[INFO] ${message}`, metadata ?? "");
  }

  warn(message: string, metadata?: unknown): void {
    console.warn(`[WARN] ${message}`, metadata ?? "");
  }

  error(message: string, metadata?: unknown): void {
    console.error(`[ERROR] ${message}`, metadata ?? "");
  }

  debug(message: string, metadata?: unknown): void {
    console.debug(`[DEBUG] ${message}`, metadata ?? "");
  }
}
