export interface VendorDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceCategories: string[];
  serviceAreas: string[];
  coverageRadiusKm?: number;
  latitude?: number;
  longitude?: number;
  certifications: string[];
}
