import crypto from "node:crypto";
import { Types } from "mongoose";
import { AppError } from "@/shared/errors/AppError.js";
import { ROLES } from "@/shared/constants/roles.js";
import { InvitationRepository } from "./invitation.repository.js";
import { UserService } from "@/modules/users/user.service.js";
import { EmailService } from "@/shared/services/email/email.service.js";
import { InvitationType, InvitationStatus } from "./invitation.types.js";
import type { CreateInvitationDto } from "./invitation.schema.js";
import { hashToken } from "@/shared/utils/token-hash.js";
import { toObjectId } from "@/shared/validators/objectId.js";
import type { JwtPayload } from "@/shared/types/jwt.types.js";
import type { ListInvitationsDto } from "./invitation.types.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import type { IInvitation } from "./invitation.types.js";
import { AUDIT_ACTIONS } from "../audit/audit.types.js";

const organizationInviteRoles: string[] = [
  ROLES.FACILITY_MANAGER,
  ROLES.TECHNICIAN,
  ROLES.FINANCE,
  ROLES.STAFF,
];

const vendorInviteRoles: string[] = [
  ROLES.VENDOR_MANAGER,
  ROLES.VENDOR_TECHNICIAN,
];

export class InvitationService {
  constructor(
    private readonly repository: InvitationRepository,

    private readonly userService: UserService,

    private readonly emailService: EmailService,

    private readonly auditLogService: AuditLogService,
  ) {}

  private ensureScope(invitation: IInvitation, actor: JwtPayload) {
    if (
      actor.organizationId &&
      invitation.organizationId?.toString() !== actor.organizationId.toString()
    ) {
      throw new AppError("Forbidden", 403);
    }

    if (
      actor.vendorId &&
      invitation.vendorId?.toString() !== actor.vendorId.toString()
    ) {
      throw new AppError("Forbidden", 403);
    }
  }

  async create(dto: CreateInvitationDto, actor: JwtPayload) {
    let invitation: IInvitation;
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const inviter = await this.userService.getRequiredUser(actor.userId);

    const existingUser = await this.userService.findByEmail(dto.email);

    if (existingUser) {
      throw new AppError("User already exists", 409);
    }

    const pending = await this.repository.findPendingByEmail(dto.email);

    if (pending) {
      throw new AppError(
        "A pending invitation already exists for this email",
        409,
      );
    }

    if (
      actor.role === ROLES.ADMIN &&
      organizationInviteRoles.includes(dto.role)
    ) {
      if (!inviter.organizationId) {
        throw new AppError("Admin is not attached to an organization", 403);
      }

      invitation = await this.repository.create({
        email: dto.email,
        role: dto.role,
        invitationType: InvitationType.ORGANIZATION,
        invitedBy: new Types.ObjectId(actor.userId),
        ...(dto.resentFromInvitationId && {
          resentFromInvitationId: toObjectId(dto.resentFromInvitationId),
        }),
        organizationId: inviter.organizationId,
        ...(dto.facilityId && { facilityId: toObjectId(dto.facilityId) }),
        tokenHash,
        expiresAt,
        status: InvitationStatus.PENDING,
      });
    } else if (
      actor.role === ROLES.VENDOR_LEAD &&
      vendorInviteRoles.includes(dto.role)
    ) {
      if (!inviter.vendorId) {
        throw new AppError("Vendor lead is not attached to a vendor", 403);
      }

      invitation = await this.repository.create({
        email: dto.email,
        role: dto.role,
        invitationType: InvitationType.VENDOR,
        invitedBy: new Types.ObjectId(actor.userId),
        ...(dto.resentFromInvitationId && {
          resentFromInvitationId: toObjectId(dto.resentFromInvitationId),
        }),
        vendorId: inviter.vendorId,
        tokenHash,
        expiresAt,
        status: InvitationStatus.PENDING,
      });
    } else {
      throw new AppError("This role cannot invite the requested user", 403);
    }
    await this.emailService.sendInvitationEmail(
      dto.email,

      token,
    );

    await this.auditLogService.log({
      actorId: toObjectId(actor.userId),

      action: AUDIT_ACTIONS.INVITATION_CREATED,

      entityType: "invitation",

      entityId: invitation._id,

      metadata: {
        email: invitation.email,
        role: invitation.role,
        invitationType: invitation.invitationType,
      },
    });

    return invitation;
  }

  async listInvitations(
    query: ListInvitationsDto,

    actor: JwtPayload,
  ) {
    const filter: Record<string, unknown> = {};

    if (actor.organizationId) {
      filter.organizationId = actor.organizationId;
    }

    if (actor.vendorId) {
      filter.vendorId = actor.vendorId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.role) {
      filter.role = query.role;
    }

    if (query.facilityId) {
      filter.facilityId = query.facilityId;
    }

    if (query.search) {
      filter.email = {
        $regex: query.search,
        $options: "i",
      };
    }

    return this.repository.findMany(
      filter,

      Number(query.page ?? 1),

      Number(query.limit ?? 20),
    );
  }

  async getInvitation(
    invitationId: string,

    actor: JwtPayload,
  ) {
    const invitation = await this.repository.findById(invitationId);

    if (!invitation) {
      throw new AppError("Invitation not found", 404);
    }

    this.ensureScope(invitation, actor);

    return invitation;
  }

  async revokeInvitation(
    invitationId: string,

    actor: JwtPayload,
  ) {
    const invitation = await this.repository.findById(invitationId);

    if (!invitation) {
      throw new AppError("Invitation not found", 404);
    }

    this.ensureScope(invitation, actor);

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AppError("Only pending invitations can be revoked", 400);
    }

    const revoke = await this.repository.revoke(
      invitationId,

      actor.userId,

      "Revoked by administrator",
    );

    await this.auditLogService.log({
      actorId: toObjectId(actor.userId),

      action: AUDIT_ACTIONS.INVITATION_REVOKED,

      entityType: "invitation",

      entityId: invitation._id,
    });

    return revoke;
  }

  async resendInvitation(
    invitationId: string,

    actor: JwtPayload,
  ) {
    const invitation = await this.repository.findById(invitationId);

    if (!invitation) {
      throw new AppError("Invitation not found", 404);
    }

    this.ensureScope(invitation, actor);

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AppError("Only pending invitations can be resent", 400);
    }

    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = hashToken(token);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updatedInvitation = await this.repository.resend(
      invitationId,
      tokenHash,
      expiresAt,
    );

    await this.emailService.sendInvitationEmail(invitation.email, token);

    await this.auditLogService.log({
      actorId: toObjectId(actor.userId),

      action: AUDIT_ACTIONS.INVITATION_RESENT,

      entityType: "invitation",

      entityId: invitation._id,

      metadata: {
        resendCount: updatedInvitation?.resendCount,
      },
    });

    return {
      message: "Invitation resent successfully",
    };
  }

  async validate(token: string) {
    const tokenHash = hashToken(token);

    const invitation = await this.repository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new AppError("Invitation not found", 404);
    }

    if (invitation.status !== "pending") {
      throw new AppError("Invitation already used", 400);
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppError("Invitation expired", 400);
    }

    return invitation;
  }

  async accept(invitationId: string, userId: string) {
    const accepted = await this.repository.markAccepted(invitationId, userId);
    await this.auditLogService.log({
      actorId: toObjectId(userId),

      targetUserId: toObjectId(userId),

      action: AUDIT_ACTIONS.INVITATION_ACCEPTED,

      entityType: "invitation",

      entityId: toObjectId(invitationId),
    });

    return accepted;
  }
}
