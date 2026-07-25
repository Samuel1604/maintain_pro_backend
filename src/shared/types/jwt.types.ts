import type { UserRole } from "@/shared/constants/roles.js";

export interface JwtPayload {
  userId: string;
  role: UserRole;
  organizationId?: string;
  vendorId?: string;
  facilityId?: string;
}
