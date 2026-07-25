import type { UserRole } from "@/shared/constants/roles.js";

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}
