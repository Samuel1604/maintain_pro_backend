import type { IUser } from "@/modules/users/user.types.js";
import {
  UserFactory,
  type CreateUserOptions,
} from "../factories/user.factory.js";
import { OrganizationFactory } from "../factories/organization.factory.js";
import { AppContainer } from "@/container/app.container.js";
import type { AuthResponse } from "@/modules/identity/auth.types.js";
import { ROLES, type UserRole } from "@/shared/constants/roles.js";

export interface AuthenticatedUserResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
  authResponse: AuthResponse;
}

const defaultSessionMetadata = {
  ipAddress: "127.0.0.1",
  userAgent: "Vitest-Test-Agent",
};

/**
 * Helper to register/create a user and run the real auth login pipeline.
 */
export async function createAuthenticatedUser(
  userOptions: CreateUserOptions = {},
  container: AppContainer = new AppContainer(),
): Promise<AuthenticatedUserResult> {
  const organizationRoles = new Set<string>([
    ROLES.ADMIN,
    ROLES.FACILITY_MANAGER,
    ROLES.TECHNICIAN,
    ROLES.FINANCE,
    ROLES.STAFF,
  ]);
  const options = { ...userOptions };
  if (organizationRoles.has(options.role ?? ROLES.STAFF) && !options.organizationId) {
    const organization = await OrganizationFactory.create();
    options.organizationId = organization._id;
  }
  const { user, rawPassword } = await UserFactory.create(options);

  const loginResult = await container.authService.login(
    {
      email: user.email,
      password: rawPassword,
    },
    defaultSessionMetadata,
  );

  if (!loginResult.data) {
    throw new Error("Failed to authenticate test user");
  }

  const authResponse = loginResult.data;

  return {
    user,
    accessToken: authResponse.accessToken,
    refreshToken: authResponse.refreshToken,
    authResponse,
  };
}

/**
 * Creates and logs in a verified Organization Admin user.
 */
export async function loginAsOrganizationAdmin(
  options: Omit<CreateUserOptions, "role" | "isVerified"> = {},
  container: AppContainer = new AppContainer(),
): Promise<AuthenticatedUserResult> {
  const { user, rawPassword } =
    await UserFactory.createVerifiedOrganizationAdmin(options);

  const loginResult = await container.authService.login(
    {
      email: user.email,
      password: rawPassword,
    },
    defaultSessionMetadata,
  );

  if (!loginResult.data) {
    throw new Error("Failed to authenticate test user");
  }

  const authResponse = loginResult.data;

  return {
    user,
    accessToken: authResponse.accessToken,
    refreshToken: authResponse.refreshToken,
    authResponse,
  };
}

/**
 * Creates and logs in a verified Vendor Lead user.
 */
export async function loginAsVendorLead(
  options: Omit<CreateUserOptions, "role"> = {},
  container: AppContainer = new AppContainer(),
): Promise<AuthenticatedUserResult> {
  const { user, rawPassword } = await UserFactory.createVendorLead(options);

  const loginResult = await container.authService.login(
    {
      email: user.email,
      password: rawPassword,
    },
    defaultSessionMetadata,
  );

  if (!loginResult.data) {
    throw new Error("Failed to authenticate test user");
  }

  const authResponse = loginResult.data;

  return {
    user,
    accessToken: authResponse.accessToken,
    refreshToken: authResponse.refreshToken,
    authResponse,
  };
}

/**
 * Creates an invited user, accepts invitation, and authenticates through the real flow.
 */
export async function loginAsInvitedUser(
  invitationOptions: {
    email?: string;
    role?: UserRole;
    organizationId?: string;
    vendorId?: string;
  } = {},
  container: AppContainer = new AppContainer(),
): Promise<AuthenticatedUserResult> {
  const email =
    invitationOptions.email ??
    `invited-${Math.floor(Math.random() * 10000)}@test.com`;
  const rawPassword = "Password123!";

  const inviter = await UserFactory.createVerifiedOrganizationAdmin();
  const invitationResult = await container.invitationService.create(
    {
      email,
      role: invitationOptions.role ?? ROLES.STAFF,
      invitedBy: inviter.user._id.toString(),
      invitationType: "organization",
      ...(invitationOptions.organizationId && {
        organizationId: invitationOptions.organizationId,
      }),
    },
    {
      userId: inviter.user._id.toString(),
      role: inviter.user.role,
      organizationId: inviter.user.organizationId?.toString(),
    },
  );

  if (!invitationResult.data) {
    throw new Error("Failed to create test invitation");
  }

  const pendingInvitation = invitationResult.data;

  const acceptedUser = await UserFactory.create({
    email,
    password: rawPassword,
    isVerified: true,
    status: "active",
    organizationId: pendingInvitation.organizationId,
  });

  const loginResult = await container.authService.login(
    {
      email: acceptedUser.user.email,
      password: rawPassword,
    },
    defaultSessionMetadata,
  );

  if (!loginResult.data) {
    throw new Error("Failed to authenticate invited user");
  }

  const authResponse = loginResult.data;

  return {
    user: acceptedUser.user,
    accessToken: authResponse.accessToken,
    refreshToken: authResponse.refreshToken,
    authResponse,
  };
}
