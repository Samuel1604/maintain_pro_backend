export interface Logger {
  info(message: string, metadata?: unknown): void;

  warn(message: string, metadata?: unknown): void;

  error(message: string, metadata?: unknown): void;

  debug?(message: string, metadata?: unknown): void;
}
