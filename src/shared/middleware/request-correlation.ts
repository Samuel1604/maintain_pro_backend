import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

const REQUEST_ID_HEADER = "x-request-id";

export const requestCorrelation: RequestHandler = (req, res, next) => {
  const supplied = req.get(REQUEST_ID_HEADER)?.trim();
  const requestId = supplied && supplied.length <= 128 ? supplied : randomUUID();
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
};
