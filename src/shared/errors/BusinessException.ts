import { AppError, type AppErrorOptions } from "./AppError.js";

export class BusinessException extends AppError {
  constructor(message = "Business rule violation", options: Omit<AppErrorOptions, "statusCode"> = {}) {
    super(message, {
      statusCode: 422,
      code: "BUSINESS_ERROR",
      ...options,
    });
  }
}
