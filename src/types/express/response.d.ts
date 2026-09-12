import type { PaginationMeta } from "../../shared/response/response-types.js";
import type { ResponseOptions } from "../../shared/response/response-options.js";

declare global {
  namespace Express {
    interface Response {
      ok<T>(data: T, options?: ResponseOptions | string): this;
      created<T>(data: T, options?: ResponseOptions | string): this;
      accepted<T>(data: T, options?: ResponseOptions | string): this;
      noContent(options?: ResponseOptions | string): this;
      paginated<T>(
        data: T[],
        meta: PaginationMeta,
        options?: ResponseOptions | string,
      ): this;
    }
  }
}
