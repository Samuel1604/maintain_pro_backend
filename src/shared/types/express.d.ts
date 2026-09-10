import type { ResponseOptions } from "../response/response-options";
import type { PaginationMeta } from "../response/response-types";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      validated: {
        body: unknown;
        params: unknown;
        query: unknown;
      };
    }

    interface Response {
      // Status 200
      ok<T = unknown>(data: T, options?: ResponseOptions | string): this;

      // Status 201
      created<T = unknown>(data: T, options?: ResponseOptions | string): this;

      // Status 202
      accepted<T = unknown>(data: T, options?: ResponseOptions | string): this;

      // Status 204
      noContent(options?: ResponseOptions | string): this;

      // Status 200 with pagination
      paginated<T = unknown>(
        data: T[],
        pagination: PaginationMeta,
        options?: ResponseOptions | string,
      ): this;
    }
  }
}
