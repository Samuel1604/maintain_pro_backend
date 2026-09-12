import type { PaginationMeta } from "./response-types.js";

export interface ResponseOptions {
  message?: string;
  includeTimestamp?: boolean;
  meta?: PaginationMeta | Record<string, unknown>;
  [key: string]: unknown;
}
