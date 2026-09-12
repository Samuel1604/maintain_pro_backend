import type { JwtPayload } from "../../shared/types/jwt.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
