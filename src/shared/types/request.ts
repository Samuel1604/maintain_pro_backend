import type { Request } from "express";
import type { JwtPayload } from "./jwt.types.js";

export interface ValidatedData<
  Params = unknown,
  Body = unknown,
  Query = unknown,
> {
  params?: Params;
  body?: Body;
  query?: Query;
}

export interface AppRequest<Params = unknown, Body = unknown, Query = unknown>
  extends Request {
  user: JwtPayload;

  validated: ValidatedData<Params, Body, Query>;
}
