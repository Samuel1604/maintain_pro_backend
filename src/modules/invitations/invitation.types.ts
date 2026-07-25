import { Document, Types } from "mongoose";
import type { UserRole } from "@/shared/constants/roles.js";

export interface IInvitation extends Document {
  email: string;

  role: UserRole;

  invitationType: InvitationType;

  invitedBy: Types.ObjectId;

  resentFromInvitationId?: Types.ObjectId;

  organizationId?: Types.ObjectId;

  facilityId?: Types.ObjectId;

  vendorId?: Types.ObjectId;

  tokenHash: string;

  resendCount: number;

  lastSentAt: Date;

  expiresAt: Date;

  acceptedAt?: Date;

  acceptedBy?: Types.ObjectId;

  revokedAt?: Date;

  revokedBy?: Types.ObjectId;

  revokeReason?: string;

  status: InvitationStatus;

  createdAt: Date;
  updatedAt: Date;
}

export interface InviteRoles {
  FACILITY_MANAGER: "facility_manager";
  TECHNICIAN: "technician";
  FINANCE: "finance";
  STAFF: "staff";
  VENDOR_MANAGER: "vendor_manager";
  VENDOR_TECHNICIAN: "vendor_technician";
}

export enum InvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

export enum InvitationType {
  ORGANIZATION = "organization",
  VENDOR = "vendor",
  FACILITY = "facility",
}

export interface ListInvitationsDto {
  status?: "pending" | "accepted" | "expired" | "revoked";

  role?: UserRole;

  facilityId?: string;

  search?: string;

  page?: number;

  limit?: number;
}
