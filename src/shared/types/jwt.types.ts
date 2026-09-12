import type { UserRole } from "@/shared/constants/roles.js";

export interface JwtPayload {
  userId: string;
  role: UserRole;
  organizationId?: string;
  vendorId?: string;
  facilityId?: string;
  /**
   * Populated by authMiddleware from the current DB record (never from the
   * signed token itself, so it always reflects the latest verification
   * state). Authorization-layer middleware (e.g. requireVerifiedEmail)
   * reads this — authentication itself no longer depends on it.
   */
  isVerified?: boolean;
}
