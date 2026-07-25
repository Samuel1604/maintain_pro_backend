export interface CreateSlaAgreementDto {
  vendorApplicationId: string;
  responseTimeHours: number;
  resolutionTimeHours: number;
  warrantyPeriodDays: number;
  penaltyTerms?: string;
  notes?: string;
}
