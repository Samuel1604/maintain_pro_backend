import { UserRepository } from "@/modules/users/user.repository.js";
import type { IUser } from "@/modules/users/user.types.js";
import type { Types } from "mongoose";
import { ROLES, type UserRole } from "@/shared/constants/roles.js";
import { hashPassword } from "@/shared/utils/bcrypt.js";
import { OrganizationFactory } from "./organization.factory.js";
import { VendorFactory } from "./vendor.factory.js";

export interface CreateUserOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isVerified?: boolean;
  status?: "pending_verification" | "active" | "suspended";
  organizationId?: Types.ObjectId | undefined;
  vendorId?: Types.ObjectId | undefined;
  overrides?: Partial<IUser>;
}

export class UserFactory {
  private static repository = new UserRepository();

  public static async create(
    options: CreateUserOptions = {},
  ): Promise<{ user: IUser; rawPassword: string }> {
    const randomSuffix = Math.floor(Math.random() * 10000);
    const rawPassword = options.password ?? "Password123!";
    const hashedPassword = await hashPassword(rawPassword);

    const defaultData: Partial<IUser> = {
      firstName: options.firstName ?? "Test",
      lastName: options.lastName ?? `User${randomSuffix}`,
      email: options.email ?? `user-${randomSuffix}@test.com`,
      password: hashedPassword,
      role: options.role ?? ROLES.STAFF,
      provider: "local",
      isVerified: options.isVerified ?? true,
      phoneVerified: false,
      status: options.status ?? "active",
      ...(options.organizationId && { organizationId: options.organizationId }),
      ...(options.vendorId && { vendorId: options.vendorId }),
      ...options.overrides,
    };

    const user = await this.repository.create(defaultData);
    return { user, rawPassword };
  }

  public static async createVerifiedOrganizationAdmin(
    options: Omit<CreateUserOptions, "role" | "isVerified"> = {},
  ): Promise<{ user: IUser; rawPassword: string }> {
    let orgId = options.organizationId;
    if (!orgId) {
      const org = await OrganizationFactory.create();
      orgId = org._id;
    }

    return this.create({
      ...options,
      role: ROLES.ADMIN,
      isVerified: true,
      status: "active",
      organizationId: orgId,
    });
  }

  public static async createVendorLead(
    options: Omit<CreateUserOptions, "role"> = {},
  ): Promise<{ user: IUser; rawPassword: string }> {
    let vendorId = options.vendorId;
    if (!vendorId) {
      const vendor = await VendorFactory.create();
      vendorId = vendor._id;
    }

    return this.create({
      ...options,
      role: ROLES.VENDOR_LEAD,
      isVerified: true,
      status: "active",
      vendorId,
    });
  }
}
