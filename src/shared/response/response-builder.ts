import type { ApplicationResult } from "../application-result/application-result.js";
import type { PaginatedApplicationResult } from "../application-result/paginated-application-result.js";
import type { PaginationMeta } from "./response-types.js";
import type { ResponseOptions } from "./response-options.js";
import type { ValidationIssue } from "../errors/validation-issue.js";
import { RESPONSE_MESSAGES } from "./response-messages.js";

export class ResponseBuilder {
  static buildSuccess<T>(
    data: T,
    defaultMessage: string = RESPONSE_MESSAGES.OK,
    options?: ResponseOptions,
  ): ApplicationResult<T> {
    const envelope: ApplicationResult<T> = {
      success: true,
      message: options?.message ?? defaultMessage,
      data,
    };

    if (options?.meta) {
      envelope.meta = options.meta;
    }

    if (options?.includeTimestamp) {
      envelope.timestamp = new Date().toISOString();
    }

    return envelope;
  }

  static buildPaginated<T>(
    data: T[],
    meta: PaginationMeta,
    options?: ResponseOptions,
  ): PaginatedApplicationResult<T> {
    const envelope: PaginatedApplicationResult<T> = {
      success: true,
      message: options?.message ?? RESPONSE_MESSAGES.PAGINATED,
      data,
      meta,
    };

    if (options?.includeTimestamp) {
      envelope.timestamp = new Date().toISOString();
    }

    return envelope;
  }

  static buildNoContent(options?: ResponseOptions): ApplicationResult<undefined> {
    const envelope: ApplicationResult<undefined> = {
      success: true,
      message: options?.message ?? RESPONSE_MESSAGES.NO_CONTENT,
    };

    if (options?.includeTimestamp) {
      envelope.timestamp = new Date().toISOString();
    }

    return envelope;
  }

  static buildError(
    message: string,
    errors?: ValidationIssue[],
    options?: ResponseOptions & { code?: string },
  ): ApplicationResult<undefined> {
    const envelope: ApplicationResult<undefined> = {
      success: false,
      message,
    };

    if (errors) {
      envelope.errors = errors;
    }

    if (options?.code) {
      envelope.code = options.code;
    }

    if (options?.meta) {
      envelope.meta = options.meta;
    }

    if (options?.includeTimestamp) {
      envelope.timestamp = new Date().toISOString();
    }

    return envelope;
  }
}
