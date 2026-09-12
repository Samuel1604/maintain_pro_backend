import type { PaginationMeta } from "../response/response-types.js";
import type { ValidationIssue } from "../errors/validation-issue.js";

export interface ApplicationResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationIssue[];
  meta?: PaginationMeta | Record<string, unknown>;
  timestamp?: string;
  /**
   * Stable machine-readable error identifier (e.g. "EMAIL_NOT_VERIFIED").
   * Only present on error responses. Clients should key error-specific
   * behavior off this rather than parsing `message` text.
   */
  code?: string;
}
