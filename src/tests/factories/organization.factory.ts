import { OrganizationRepository } from "@/modules/organizations/organization.repository.js";
import type { IOrganization } from "@/modules/organizations/organization.types.js";

export class OrganizationFactory {
  private static repository = new OrganizationRepository();

  public static async create(overrides: Partial<IOrganization> = {}): Promise<IOrganization> {
    const randomSuffix = Math.floor(Math.random() * 10000);

    const defaultData: Partial<IOrganization> = {
      name: `Test Organization ${randomSuffix}`,
      slug: `test-organization-${randomSuffix}-${Date.now()}`,
      industry: "Facilities Management",
      email: `admin-${randomSuffix}@testorg.com`,
      phone: `+1555${randomSuffix.toString().padStart(4, "0")}`,
      address: { street: "127 Innovation Way", city: "Tech City", state: "CA", postalCode: "90210", country: "US" },
      isVerified: true,
      status: "active",
      ...overrides,
    };

    return this.repository.create(defaultData);
  }
}
