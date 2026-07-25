import type { Document } from "mongoose";
export interface IVendor extends Document {
  // Company
  name: string;

  email: string;
  phone: string;

  website?: string;

  address?: string;

  companyRegistrationNumber?: string;

  // Marketplace
  serviceCategories: string[];

  certifications: string[];

  // Coverage
  coverageRadiusKm: number;

  baseCoordinates: {
    type: "Point";
    coordinates: [number, number];
  };

  // Subscription
  plan: "free" | "starter" | "professional";

  subscriptionStatus:
    | "trial"
    | "active"
    | "past_due"
    | "cancelled";

  applicationLimit: number;

  // Reputation
  averageRating?: number;

  completedJobs?: number;

  // Verification
  isVerified: boolean;

  verificationBadge:
    | "none"
    | "verified"
    | "premium";

  // Status
  status:
    | "active"
    | "inactive"
    | "suspended";

  createdAt: Date;
  updatedAt: Date;
}
export interface VendorCompanyInfo {
  name: string;
  email: string;
  phone: string;
  address?: string;
  serviceCategories: string[];
  serviceAreas: string[];
  coverageRadiusKm?: number;
  latitude?: number;
  longitude?: number;
  certifications: string[];
}
