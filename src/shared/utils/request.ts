import type { AppRequest } from "@/shared/types/request.js";
import type { NextFunction, RequestHandler, Response } from "express";

export function requestHandler<TRequest extends AppRequest = AppRequest>(
  handler: (req: TRequest, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req as TRequest, res, next);
    } catch (error) {
      next(error);
    }
  };
}
