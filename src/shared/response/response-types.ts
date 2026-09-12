import type { ApplicationResult } from "../application-result/application-result.js";
import type { PaginatedApplicationResult } from "../application-result/paginated-application-result.js";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type { ApplicationResult, PaginatedApplicationResult };
