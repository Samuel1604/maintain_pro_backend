import type { Document, Types } from "mongoose";
import { type UserRole } from "@/shared/constants/roles.js";
import { type AuthProvider } from "@/shared/constants/auth-providers.js";
import { type AccountStatus } from "@/shared/constants/account-status.js";
export interface IUser extends Document {
  // Identity
  firstName: string;
  lastName: string;

  email: string;

  phone?: string;

  // Local Auth
  password?: string;

  // OAuth
  provider: AuthProvider;

  providers: {
    local?: boolean;
    google?: boolean;
    linkedin?: boolean;
    apple?: boolean;
  };

  googleId?: string;
  appleId?: string;
  linkedinId?: string;

  // Verification
  isVerified: boolean;
  emailVerifiedAt?: Date;
  phoneVerified: boolean;

  // Profile
  avatar?: string;

  // Access Control
  role: UserRole;

  organizationId?: Types.ObjectId;
  facilityId?: Types.ObjectId;
  vendorId?: Types.ObjectId;

  // Account Status
  status: AccountStatus;

  // Security
  failedLoginAttempts: number;

  lockedUntil?: Date;

  lastLoginAt?: Date;

  lastPasswordChangeAt?: Date;

  lastEmailChangeAt?: Date;

  passwordResetAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
