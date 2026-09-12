export interface VendorProfile {
  id: string;
  slug: string;
  name: string;

  email: string;
  phone: string;
  website?: string;
  logo?: string;

  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  companyRegistrationNumber?: string;

  serviceCategories: string[];
  certifications?: string[];

  coverageRadiusKm: number;
  baseCoordinates?: {
    type: "Point";
    coordinates: [number, number];
  };

  plan: string;
  subscriptionStatus: string;
  applicationLimit: number;

  averageRating?: number;
  completedJobs?: number;

  isVerified: boolean;
  verificationBadge: string;

  status: string;

  createdAt?: string;
  updatedAt?: string;
}
