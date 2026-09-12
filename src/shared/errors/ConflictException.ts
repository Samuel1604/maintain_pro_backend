import { AppError, type AppErrorOptions } from "./AppError.js";

export class ConflictException extends AppError {
  constructor(message = "Resource conflict", options: Omit<AppErrorOptions, "statusCode"> = {}) {
    super(message, {
      statusCode: 409,
      code: "CONFLICT_ERROR",
      ...options,
    });
  }
}
