export const ROLES = {
  ADMIN: "admin",
  FACILITY_MANAGER: "facility_manager",
  TECHNICIAN: "technician",
  VENDOR_LEAD: "vendor_lead",
  VENDOR_MANAGER: "vendor_manager",
  VENDOR_TECHNICIAN: "vendor_technician",
  FINANCE: "finance",
  STAFF: "staff",
} as const;

export type UserRole =
  (typeof ROLES)[keyof typeof ROLES];

export const FacilityRoles = {
  FACILITY_MANAGER: ROLES.FACILITY_MANAGER,
  TECHNICIAN: ROLES.TECHNICIAN,
  STAFF: ROLES.STAFF,
} as const;

export type FacilityRole =
  (typeof FacilityRoles)[keyof typeof FacilityRoles];
