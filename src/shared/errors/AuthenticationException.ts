import { AppError, type AppErrorOptions } from "./AppError.js";

export class AuthenticationException extends AppError {
  constructor(message = "Authentication required", options: Omit<AppErrorOptions, "statusCode"> = {}) {
    super(message, {
      statusCode: 401,
      code: "AUTHENTICATION_ERROR",
      ...options,
    });
  }
}
