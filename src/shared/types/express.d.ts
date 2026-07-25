import type { UserRole } from "@/shared/constants/roles.js";

declare global {
  namespace Express {
    interface Request {
      validated: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}
