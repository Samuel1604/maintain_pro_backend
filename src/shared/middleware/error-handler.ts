import type { Request, Response, NextFunction } from "express";
import { AppError, ConflictException, ValidationException } from "../errors/index.js";
import { ResponseBuilder } from "../response/response-builder.js";
import { appConfig } from "@/config/app.config.js";
import { loggerService } from "@/container/index.js";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error & { statusCode?: number; status?: number },
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof ZodError) {
    const validation = new ValidationException("Request validation failed", err.flatten().fieldErrors);
    return res.status(validation.statusCode).json(
      ResponseBuilder.buildError(validation.message, validation.validationErrors, { includeTimestamp: true }),
    );
  }

  if (err.name === "VersionError") {
    const conflict = new ConflictException("The record changed while you were updating it. Refresh and try again.");
    return res.status(conflict.statusCode).json(ResponseBuilder.buildError(conflict.message, undefined, { includeTimestamp: true, code: conflict.code }));
  }

  // Operational errors (AppError and subclasses) are errors we threw on
  // purpose with a message that's already safe to show the client —
  // log them at a lower level for visibility without alarm-fatigue.
  if (err instanceof ValidationException) {
    loggerService.warn(`Handled validation error: ${err.message}`, {
      path: req.path,
      method: req.method,
    });

    const payload = ResponseBuilder.buildError(
      err.message,
      err.validationErrors,
      {
        includeTimestamp: true,
      },
    );

    return res.status(err.statusCode).json(payload);
  }

  if (err instanceof AppError) {
    loggerService.warn(`Handled error: ${err.message}`, {
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
      code: err.code,
    });

    const payload = ResponseBuilder.buildError(
      err.message,
      undefined,
      {
        includeTimestamp: true,
        code: err.code,
      },
    );

    return res.status(err.statusCode).json(payload);
  }

  // Anything else is an error we didn't anticipate — always log it with
  // the full stack, since this is the only place that will ever see it.
  const statusCode = err.statusCode || err.status || 500;

  loggerService.error(`Unhandled error: ${err.message}`, {
    path: req.path,
    method: req.method,
    statusCode,
    stack: err.stack,
  });

  // Never echo an unrecognized error's message back to the client in
  // production — it may contain internal details (driver/library error
  // text, file paths, etc.) that were never meant to be user-facing.
  // Outside production, surface the real message to speed up debugging.
  const message = appConfig.isProduction
    ? "Internal Server Error"
    : err.message || "Internal Server Error";

  const payload = ResponseBuilder.buildError(message, undefined, {
    includeTimestamp: true,
  });

  return res.status(statusCode).json(payload);
};
