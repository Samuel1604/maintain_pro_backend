import type { UserRole } from "@/shared/constants/roles.js";
import type { UserProfile } from "../users/dto/user-profile.dto.js";
import { Types } from "mongoose";

export interface CreateUser {
  firstName: string;
  lastName: string;

  email: string;

  password: string;

  role: UserRole;

  organizationId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
}

export interface Cookies {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  sessionId: string;
}
