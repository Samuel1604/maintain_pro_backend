import crypto from "node:crypto";
import { InvitationRepository } from "@/modules/invitations/invitation.repository.js";
import { InvitationStatus, InvitationType, type IInvitation } from "@/modules/invitations/invitation.types.js";
import { ROLES, type UserRole } from "@/shared/constants/roles.js";
import { hashToken } from "@/shared/utils/token-hash.js";
import { toObjectId } from "@/shared/validators/index.js";

export interface CreateInvitationOptions {
  email?: string;
  role?: UserRole;
  invitationType?: InvitationType;
  invitedBy?: string;
  organizationId?: string;
  vendorId?: string;
  overrides?: Partial<IInvitation>;
}

export class InvitationFactory {
  private static repository = new InvitationRepository();

  public static async create(options: CreateInvitationOptions = {}): Promise<{ invitation: IInvitation; rawToken: string }> {
    const randomSuffix = Math.floor(Math.random() * 10000);
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const email = options.email ?? `invited-${randomSuffix}@test.com`;
    const role = options.role ?? (ROLES.TECHNICIAN as UserRole);
    const invitationType = options.invitationType ?? InvitationType.ORGANIZATION;

    const defaultData: Partial<IInvitation> = {
      email,
      role,
      invitationType,
      invitedBy: toObjectId(options.invitedBy ?? "507f1f77bcf86cd799439011"),
      ...(options.organizationId && { organizationId: toObjectId(options.organizationId) }),
      ...(options.vendorId && { vendorId: toObjectId(options.vendorId) }),
      tokenHash,
      expiresAt,
      status: InvitationStatus.PENDING,
      ...options.overrides,
    };

    const invitation = await this.repository.create(defaultData);
    return { invitation, rawToken };
  }
}
