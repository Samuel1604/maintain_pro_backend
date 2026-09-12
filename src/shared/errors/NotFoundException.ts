import { AppError, type AppErrorOptions } from "./AppError.js";

export class NotFoundException extends AppError {
  constructor(message = "Resource not found", options: Omit<AppErrorOptions, "statusCode"> = {}) {
    super(message, {
      statusCode: 404,
      code: "NOT_FOUND_ERROR",
      ...options,
    });
  }
}
