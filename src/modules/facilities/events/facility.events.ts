export const FacilityEvents = {
  // Facility lifecycle
  FACILITY_CREATED: "facility.created",
  FACILITY_UPDATED: "facility.updated",
  FACILITY_DEACTIVATED: "facility.deactivated",
  FACILITY_DELETED: "facility.deleted",
} as const;

export type FacilityEventName = (typeof FacilityEvents)[keyof typeof FacilityEvents];
