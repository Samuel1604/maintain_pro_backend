import crypto from "node:crypto";
import { Types } from "mongoose";
import {
  AuthorizationException,
  ConflictException,
  NotFoundException,
  BusinessException,
} from "@/shared/errors/index.js";
import { ROLES } from "@/shared/constants/roles.js";
import { InvitationRepository } from "./invitation.repository.js";
import { UserReader } from "@/modules/users/user.reader.js";
import { EmailService } from "@/modules/email/email.service.js";
import { InvitationType, InvitationStatus } from "./invitation.types.js";
import type {
  CreateInvitationDto,
  CreateTempInvitationDto,
  ListInvitationsDto,
} from "./invitation.schema.js";
import { hashToken } from "@/shared/utils/token-hash.js";
import { toObjectId } from "@/shared/validators/index.js";
import type { JwtPayload } from "@/shared/types/jwt.types.js";
import type { EventBus } from "@/infrastructure/events/bus/event-bus.interface.js";
import { AuditLogService } from "@/modules/audit/audit.service.js";
import type { IInvitation } from "./invitation.types.js";
import type { UserRole } from "@/shared/constants/roles.js";
import { AUDIT_ACTIONS } from "../audit/audit.types.js";
import {
  InvitationCreatedEvent,
  InvitationAcceptedEvent,
} from "@/modules/identity/events/index.js";
import type {
  ApplicationResult,
  PaginatedApplicationResult,
} from "@/shared/application-result/index.js";

const organizationInviteRoles: UserRole[] = [
  ROLES.FACILITY_MANAGER,
  ROLES.TECHNICIAN,
  ROLES.FINANCE,
  ROLES.STAFF,
];

const vendorInviteRoles: UserRole[] = [
  ROLES.VENDOR_MANAGER,
  ROLES.VENDOR_TECHNICIAN,
];

export class InvitationService {
  constructor(
    private readonly repository: InvitationRepository,
    private readonly userReader: UserReader,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
    private readonly eventBus: EventBus,
    // Injected for temp-invite user creation — avoids cross-module model access
    private readonly userService?: {
      createTempInvitedUser(
        invitation: IInvitation,
        tempPassword: string,
      ): Promise<{ _id: { toString(): string } }>;
      refreshTempInvitedUser(
        invitation: IInvitation,
        tempPassword: string,
      ): Promise<{ _id: { toString(): string } }>;
    },
  ) {}

  private ensureScope(invitation: IInvitation, actor: JwtPayload) {
    if (
      actor.role === ROLES.ADMIN &&
      actor.organizationId &&
      invitation.organizationId?.toString() !== actor.organizationId.toString()
    ) {
      throw new AuthorizationException("Forbidden");
    }

    if (
      actor.vendorId &&
      invitation.vendorId?.toString() !== actor.vendorId.toString()
    ) {
      throw new AuthorizationException("Forbidden");
    }
  }

  async create(
    dto: CreateInvitationDto,
    actor: JwtPayload,
  ): Promise<ApplicationResult<IInvitation>> {
    let invitation: IInvitation;
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiration

    const inviter = await this.userReader.getRequiredUser(actor.userId);

    const existingUser = await this.userReader.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException("User already exists");
    }

    const pending = await this.repository.findPendingByEmail(dto.email);

    if (pending) {
      throw new ConflictException(
        "A pending invitation already exists for this email",
      );
    }

    if (
      actor.role === ROLES.ADMIN &&
      organizationInviteRoles.includes(dto.role as UserRole)
    ) {
      if (!inviter.organizationId) {
        throw new AuthorizationException(
          "Admin is not attached to an organization",
        );
      }

      invitation = await this.repository.create({
        email: dto.email,
        role: dto.role as UserRole,
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
      (actor.role === ROLES.VENDOR_LEAD || actor.role === ROLES.VENDOR_MANAGER) &&
      vendorInviteRoles.includes(dto.role as UserRole)
    ) {
      if (!inviter.vendorId) {
        throw new AuthorizationException(
          "Vendor lead is not attached to a vendor",
        );
      }

      invitation = await this.repository.create({
        email: dto.email,
        role: dto.role as UserRole,
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
      throw new AuthorizationException(
        "This role cannot invite the requested user",
      );
    }
    // Generates temporary password for immediate on-screen account creation
    const temporaryPassword = crypto
      .randomBytes(8)
      .toString("base64url")
      .slice(0, 12);
    if (this.userService) {
      await this.userService.createTempInvitedUser(
        invitation,
        temporaryPassword,
      );
    }

    let emailSent = false;
    /**
     * Attempts sending email if a mail provider is configured.
     * Silently handles errors so developer/testing on-screen flow never blocks.
     */
    try {
      await this.emailService.sendInvitationEmail({
        email: dto.email,
        invitationToken: token,
        role: dto.role as UserRole,
      });
      emailSent = true;
    } catch {
      // Intentionally swallow email send errors; `emailSent` remains false
    }

    await this.eventBus.publish(
      new InvitationCreatedEvent({
        invitationId: invitation._id.toString(),
        organizationId: invitation.organizationId?.toString(),
        vendorId: invitation.vendorId?.toString(),
        email: invitation.email,
        invitedBy: invitation.invitedBy.toString(),
        role: invitation.role,
      }),
    );

    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:3000";
    const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;

    return {
      success: true,
      message: emailSent
        ? "Invitation email dispatched successfully."
        : "Invitation created (no email delivery service detected). On-screen credentials generated.",
      data: {
        ...(invitation.toObject ? invitation.toObject() : invitation),
        invitationToken: token,
        invitationUrl,
        temporaryPassword,
        expiresInMinutes: 15,
        emailSent,
      } as unknown as IInvitation & {
        invitationToken: string;
        invitationUrl: string;
        temporaryPassword: string;
        expiresInMinutes: number;
        emailSent: boolean;
      },
    };
  }

  /**
   * Creates a temp-invitation: generates a random password, creates a User
   * with status 'pending_invitation' and a 15-minute TTL, and returns the
   * temporary credentials to the actor for one-time display.
   *
   * This flow lives alongside the classic invitation (OTP/link-based) and
   * will be the default until a real mail provider is wired in.
   */
  async createTempUserInvitation(
    dto: CreateTempInvitationDto,
    actor: JwtPayload,
  ): Promise<
    ApplicationResult<{
      email: string;
      temporaryPassword: string;
      expiresInMinutes: number;
    }>
  > {
    // 1. Guard: only admin (org) or vendor_lead (vendor) can send temp invites
    const allowedActorRoles: UserRole[] = [ROLES.ADMIN, ROLES.VENDOR_LEAD];
    if (!allowedActorRoles.includes(actor.role as UserRole)) {
      throw new AuthorizationException(
        "Only admins or vendor leads can send invitations.",
      );
    }

    const inviter = await this.userReader.getRequiredUser(actor.userId);

    // 2. Validate no duplicate user or pending invite
    const existingUser = await this.userReader.findByEmail(dto.email);
    if (existingUser) throw new ConflictException("User already exists");

    const pending = await this.repository.findPendingByEmail(dto.email);
    if (pending)
      throw new ConflictException(
        "A pending invitation already exists for this email",
      );

    // 3. Determine membership scope and allowed roles (mirrors create() logic)
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

    let invitation: IInvitation;
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    if (
      actor.role === ROLES.ADMIN &&
      organizationInviteRoles.includes(dto.role)
    ) {
      if (!inviter.organizationId)
        throw new AuthorizationException(
          "Admin is not attached to an organization",
        );
      invitation = await this.repository.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role as UserRole,
        invitationType: InvitationType.ORGANIZATION,
        invitedBy: new Types.ObjectId(actor.userId),
        organizationId: inviter.organizationId,
        tokenHash,
        expiresAt,
        status: InvitationStatus.PENDING,
      });
    } else if (
      (actor.role === ROLES.VENDOR_LEAD || actor.role === ROLES.VENDOR_MANAGER) &&
      vendorInviteRoles.includes(dto.role as UserRole)
    ) {
      if (!inviter.vendorId)
        throw new AuthorizationException(
          "Vendor lead is not attached to a vendor",
        );
      invitation = await this.repository.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role as UserRole,
        invitationType: InvitationType.VENDOR,
        invitedBy: new Types.ObjectId(actor.userId),
        vendorId: inviter.vendorId,
        tokenHash,
        expiresAt,
        status: InvitationStatus.PENDING,
      });
    } else {
      throw new AuthorizationException(
        "This role cannot invite the requested user type.",
      );
    }

    // 4. Generate secure temporary password
    const temporaryPassword = crypto
      .randomBytes(8)
      .toString("base64url")
      .slice(0, 12);

    // 5. Create temp user via UserService (through injected interface — no model access)
    if (!this.userService) {
      throw new BusinessException(
        "UserService not available for temp invitation flow.",
      );
    }
    await this.userService.createTempInvitedUser(invitation, temporaryPassword);

    // 6. Publish event for audit trail (no email — credentials shown in-portal)
    await this.eventBus.publish(
      new InvitationCreatedEvent({
        invitationId: invitation._id.toString(),
        organizationId: invitation.organizationId?.toString(),
        vendorId: invitation.vendorId?.toString(),
        email: invitation.email,
        invitedBy: invitation.invitedBy.toString(),
        role: invitation.role,
      }),
    );

    return {
      success: true,
      message:
        "Temporary invitation created. Share the credentials securely — they expire in 15 minutes.",
      data: { email: dto.email, temporaryPassword, expiresInMinutes: 15 },
    };
  }

  async listInvitations(
    query: ListInvitationsDto,
    actor: JwtPayload,
  ): Promise<PaginatedApplicationResult<IInvitation>> {
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

    const result = await this.repository.findMany(
      filter,
      Number(query.page ?? 1),
      Number(query.limit ?? 20),
    );

    return {
      success: true,
      message: "Invitations retrieved successfully.",
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.pages,
      },
    };
  }

  async getInvitation(
    invitationId: string,
    actor: JwtPayload,
  ): Promise<ApplicationResult<IInvitation>> {
    const invitation = await this.repository.findById(invitationId);

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    this.ensureScope(invitation, actor);

    return {
      success: true,
      message: "Invitation retrieved successfully.",
      data: invitation,
    };
  }

  async revokeInvitation(
    invitationId: string,
    actor: JwtPayload,
  ): Promise<ApplicationResult<IInvitation | null>> {
    const invitation = await this.repository.findById(invitationId);

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    this.ensureScope(invitation, actor);

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BusinessException("Only pending invitations can be revoked");
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

    return {
      success: true,
      message: "Invitation revoked successfully.",
      data: revoke,
    };
  }

  async resendInvitation(
    invitationId: string,
    actor: JwtPayload,
  ): Promise<ApplicationResult<Record<string, unknown>>> {
    const invitation = await this.repository.findById(invitationId);

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    this.ensureScope(invitation, actor);

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BusinessException("Only pending invitations can be resent");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute TTL

    const updatedInvitation = await this.repository.resend(
      invitationId,
      tokenHash,
      expiresAt,
    );

    const temporaryPassword = crypto
      .randomBytes(8)
      .toString("base64url")
      .slice(0, 12);
    if (this.userService) {
      await this.userService.refreshTempInvitedUser(
        invitation,
        temporaryPassword,
      );
    }

    let emailSent = false;
    try {
      await this.emailService.sendInvitationEmail({
        email: invitation.email,
        invitationToken: token,
        role: invitation.role,
      });
      emailSent = true;
    } catch {
      // Intentionally swallow email send errors; `emailSent` remains false
    }

    await this.auditLogService.log({
      actorId: toObjectId(actor.userId),
      action: AUDIT_ACTIONS.INVITATION_RESENT,
      entityType: "invitation",
      entityId: invitation._id,
      metadata: {
        resendCount: updatedInvitation?.resendCount,
      },
    });

    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      "http://localhost:3000";
    const invitationUrl = `${baseUrl}/accept-invitation?token=${token}`;

    return {
      success: true,
      message: emailSent
        ? "Invitation resent successfully via email."
        : "Invitation resent (no email service detected). On-screen credentials updated.",
      data: {
        ...(updatedInvitation?.toObject
          ? updatedInvitation.toObject()
          : updatedInvitation || invitation),
        invitationToken: token,
        invitationUrl,
        temporaryPassword,
        expiresInMinutes: 15,
        emailSent,
      },
    };
  }

  async validate(token: string) {
    const tokenHash = hashToken(token);

    const invitation = await this.repository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw new NotFoundException("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new BusinessException("Invitation already used");
    }

    if (invitation.expiresAt < new Date()) {
      throw new BusinessException("Invitation expired");
    }

    return invitation;
  }

  async accept(invitationId: string, userId: string) {
    const accepted = await this.repository.markAccepted(invitationId, userId);

    /**
     * Publish only. AuditLogListener is subscribed to INVITATION_ACCEPTED
     * (see container/app.container.ts) and writes the audit entry from
     * there — this used to ALSO write one directly here, producing two
     * audit-log rows for a single acceptance. Removed in favor of the one
     * event-driven write.
     */
    if (accepted) {
      await this.eventBus.publish(
        new InvitationAcceptedEvent({
          invitationId,
          userId,
          email: accepted.email,
          role: accepted.role,
        }),
      );
    }

    return accepted;
  }
}
