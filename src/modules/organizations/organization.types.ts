import type { Document } from "mongoose";

export interface IOrganization extends Document {
  // Company
  name: string;
  industry: string;

  email: string;
  phone: string;

  website?: string;

  // Address
  address: string;

  // Branding
  logo?: string;

  // Subscription
  plan: "free" | "starter" | "professional" | "enterprise";

  subscriptionStatus: "trial" | "active" | "past_due" | "cancelled";

  // Limits
  facilityLimit: number;

  facilityManagerLimit: number;

  vendorMarketplaceEnabled: boolean;

  // Verification
  isVerified: boolean;

  // Status
  status: "active" | "inactive" | "suspended";

  createdAt: Date;
  updatedAt: Date;
}