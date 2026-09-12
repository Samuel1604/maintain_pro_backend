import type { AuthRequest } from "@/shared/types/request.js";
import type { NextFunction, RequestHandler, Response } from "express";

export function requestHandler<TRequest extends AuthRequest = AuthRequest>(
  handler: (req: TRequest, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req as TRequest, res, next);
    } catch (error) {
      next(error);
    }
  };
}
