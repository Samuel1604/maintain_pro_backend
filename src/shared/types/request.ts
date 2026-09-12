import type { Request } from "express";
import type { JwtPayload } from "./jwt.types.js";
import type { UserRole } from "@/shared/constants/roles.js";

export type Actor = {
  userId: string;
  role: UserRole;
  organizationId?: string;
  facilityId?: string;
  vendorId?: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AuthRequest<
  Params = Record<string, any>,
  Body = Record<string, any>,
  Query = Record<string, any>,
  Validated = {
    body: Body;
    params: Params;
    query: Query;
  },
> = Request<Params, unknown, Body, Query> & {
  user: JwtPayload;
  validated: Validated;
};
/* eslint-enable @typescript-eslint/no-explicit-any */
