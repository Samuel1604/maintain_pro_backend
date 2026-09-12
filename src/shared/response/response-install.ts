import type { Response, Request, NextFunction } from "express";
import { ResponseBuilder } from "./response-builder.js";
import type { ResponseOptions } from "./response-options.js";
import type { PaginationMeta } from "./response-types.js";
import { RESPONSE_MESSAGES } from "./response-messages.js";

function normalizeOptions(options?: ResponseOptions | string): ResponseOptions | undefined {
  if (typeof options === "string") {
    return { message: options };
  }
  return options;
}

export function attachResponseHelpers(res: Response): void {
  // Status 200 OK (Successfull)
  res.ok = function <T>(data: T, options?: ResponseOptions | string) {
    const opts = normalizeOptions(options);
    const payload = ResponseBuilder.buildSuccess(data, RESPONSE_MESSAGES.OK, opts);
    return this.status(200).json(payload);
  };

  // Status 201 (Created)
  res.created = function <T>(data: T, options?: ResponseOptions | string) {
    const opts = normalizeOptions(options);
    const payload = ResponseBuilder.buildSuccess(data, RESPONSE_MESSAGES.CREATED, opts);
    return this.status(201).json(payload);
  };

  // Status 202 (Accepted)
  res.accepted = function <T>(data: T, options?: ResponseOptions | string) {
    const opts = normalizeOptions(options);
    const payload = ResponseBuilder.buildSuccess(data, RESPONSE_MESSAGES.ACCEPTED, opts);
    return this.status(202).json(payload);
  };

  // Status 204 (No Content)
  res.noContent = function (options?: ResponseOptions | string) {
    const opts = normalizeOptions(options);
    const payload = ResponseBuilder.buildNoContent(opts);
    return this.status(204).send(payload);
  };

  // Status 200 with pagination
  res.paginated = function <T>(
    data: T[],
    meta: PaginationMeta,
    options?: ResponseOptions | string,
  ) {
    const opts = normalizeOptions(options);
    const payload = ResponseBuilder.buildPaginated(data, meta, opts);
    return this.status(200).json(payload);
  };
}

export const responseEnhancer = (
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  attachResponseHelpers(res);
  next();
};
