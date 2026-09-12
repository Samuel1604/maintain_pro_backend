import type { AccountStatus } from "@/shared/constants/account-status.js";
import type {UserRole} from "@/shared/constants/roles.js";

export interface UserSummary {
  id: string;

  firstName: string;

  lastName: string;

  email: string;

  avatar?: string;

  role: UserRole;

  status: AccountStatus;

  isVerified: boolean;
}
