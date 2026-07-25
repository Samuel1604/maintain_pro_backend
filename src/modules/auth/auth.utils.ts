import ms from "ms";

import { jwtConfig } from "@/config/jwt.config.js";

export function calculateRefreshExpiry() {
  return new Date(Date.now() + ms(jwtConfig.refreshExpiresIn));
}
