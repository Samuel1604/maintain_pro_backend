export interface AppErrorOptions {
  statusCode?: number;
  code?: string;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly details?: unknown;
  override readonly cause?: unknown;

  constructor(
    message: string,
    options: AppErrorOptions | number = {},
  ) {
    super(message);

    this.name = new.target.name;

    if (typeof options === "number") {
      this.statusCode = options;
    } else {
      this.statusCode = options.statusCode ?? 500;
      this.code = options.code;
      this.details = options.details;
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }
}