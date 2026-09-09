import { VendorRepository } from "@/modules/vendors/vendor.repository.js";
import type { IVendor } from "@/modules/vendors/vendor.types.js";

export class VendorFactory {
  private static repository = new VendorRepository();

  public static async create(overrides: Partial<IVendor> = {}): Promise<IVendor> {
    const randomSuffix = Math.floor(Math.random() * 10000);

    const defaultData: Partial<IVendor> = {
      name: `Test Vendor ${randomSuffix}`,
      slug: `test-vendor-${randomSuffix}-${Date.now()}`,
      email: `lead-${randomSuffix}@testvendor.com`,
      phone: `+1555${randomSuffix.toString().padStart(4, "0")}`,
      address: { street: "456 Vendor Blvd", city: "Service Town", state: "CA", postalCode: "90210", country: "US" },
      serviceCategories: ["General Maintenance"],
      coverageRadiusKm: 50,
      plan: "professional",
      subscriptionStatus: "active",
      applicationLimit: 10,
      isVerified: true,
      verificationBadge: "verified",
      status: "active",
      ...overrides,
    };

    return this.repository.create(defaultData);
  }
}
