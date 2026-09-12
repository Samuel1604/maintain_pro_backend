import type { AccountStatus } from "@/shared/constants/account-status.js";
import type { AuthProvider } from "@/shared/constants/auth-providers.js";
import type { UserRole } from "@/shared/constants/roles.js";

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  provider: AuthProvider;
  status: AccountStatus;
  organizationId?: string;
  vendorId?: string;
  facilityId?: string;
  organizationSlug?: string;
  vendorSlug?: string;
  isVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}
