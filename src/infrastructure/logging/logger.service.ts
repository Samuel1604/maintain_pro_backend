import type { Logger } from "./logger.interface.js";

export class LoggerService {
  constructor(private readonly logger: Logger) {}

  info(message: string, metadata?: unknown) {
    this.logger.info(message, metadata);
  }

  warn(message: string, metadata?: unknown) {
    this.logger.warn(message, metadata);
  }

  error(message: string, metadata?: unknown) {
    this.logger.error(message, metadata);
  }

    debug(message: string, metadata?: unknown) {
    this.logger.debug?.(message, metadata);
  }
}
