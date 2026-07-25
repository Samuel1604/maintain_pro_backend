export interface CreateQuotationDto {
  vendorApplicationId: string;
  laborCost: number;
  materialCost: number;
  estimatedDurationHours: number;
  notes?: string;
}
