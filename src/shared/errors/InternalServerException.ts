import { AppError, type AppErrorOptions } from "./AppError.js";

export class InternalServerException extends AppError {
  constructor(message = "Internal server error", options: Omit<AppErrorOptions, "statusCode"> = {}) {
    super(message, {
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      ...options,
    });
  }
}
