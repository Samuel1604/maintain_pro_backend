export interface CreateServiceRequestDto {
  organizationId: string;
  facilityId: string;
  assetId?: string;
  title: string;
  description: string;
  priority?: "low" | "medium" | "high" | "critical";
  serviceCategory: string;
}

export interface ApproveServiceRequestDto {
  fulfillmentType: "internal" | "marketplace";
  technicianId?: string;
}
