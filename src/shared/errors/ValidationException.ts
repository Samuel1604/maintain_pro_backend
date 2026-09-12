import { AppError, type AppErrorOptions } from "./AppError.js";
import type { ValidationIssue } from "./validation-issue.js";

export class ValidationException extends AppError {
  public readonly validationErrors: ValidationIssue[];

  constructor(
    errors: ValidationIssue[] | string,
    options: Omit<AppErrorOptions, "statusCode" | "details"> = {},
  ) {
    const validationErrors: ValidationIssue[] =
      typeof errors === "string"
        ? [{ field: "", message: errors }]
        : errors;

    const message = typeof errors === "string" ? errors : "Validation failed";

    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details: validationErrors,
      ...options,
    });
    this.validationErrors = validationErrors;
  }
}
