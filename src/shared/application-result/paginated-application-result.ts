import type { ApplicationResult } from "./application-result.js";
import type { PaginationMeta } from "../response/response-types.js";

export interface PaginatedApplicationResult<T = unknown>
  extends ApplicationResult<T[]> {
  data: T[];
  meta: PaginationMeta;
}