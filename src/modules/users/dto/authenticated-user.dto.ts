import type { UserRole } from "@/shared/constants/roles.js";

export interface AuthenticatedUser {
    id: string;

    role: UserRole;

    organizationId?: string;

    vendorId?: string;

    facilityId?: string;
}