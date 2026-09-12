import type { Request, Response } from "express";
import { ResponseBuilder } from "@/shared/response/response-builder.js";

export const notFound = (
  req: Request,
  res: Response
) => {
  const result = ResponseBuilder.buildError(
    `Route ${req.originalUrl} not found`,
    undefined,
    { includeTimestamp: true }
  );
  return res.status(404).json(result);
};