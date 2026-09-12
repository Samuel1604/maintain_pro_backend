import { AppError, type AppErrorOptions } from "./AppError.js";

export class AuthorizationException extends AppError {
  constructor(message = "Access denied", options: Partial<AppErrorOptions> = {}) {
    super(message, {
      statusCode: 403,
      code: "AUTHORIZATION_ERROR",
      ...options,
    });
  }
}
