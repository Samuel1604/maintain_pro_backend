import ms from "ms";
import { jwtConfig } from "@/config/jwt.config.js";

export function calculateRefreshExpiry(): Date {
  const expiresIn = jwtConfig.refreshExpiresIn;
  const msValue =
    typeof expiresIn === "string" ? ms(expiresIn) : Number(expiresIn);
  return new Date(Date.now() + msValue);
}
