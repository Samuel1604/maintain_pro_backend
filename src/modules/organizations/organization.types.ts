import type { Document } from "mongoose";

export interface IOrganization extends Document {
  // Company
  name: string;
  slug: string;
  industry: string;

  email: string;
  phone: string;

  website?: string;

  // Address
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Branding
  logo?: string;

  // Verification
  isVerified: boolean;

  // Status
  status: "active" | "inactive" | "suspended";

  createdAt: Date;
  updatedAt: Date;
}
