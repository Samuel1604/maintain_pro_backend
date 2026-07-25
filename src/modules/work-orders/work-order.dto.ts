export interface CreateWorkOrderDto {
  organizationId: string;
  facilityId: string;
  assetId?: string;
  title: string;
  description: string;
  priority?: "low" | "medium" | "high" | "critical";
  serviceCategory: string;
  fulfillmentType: "internal" | "marketplace";
  technicianId?: string;
}
