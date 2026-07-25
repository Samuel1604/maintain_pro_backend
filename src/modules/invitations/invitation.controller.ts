import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { InvitationService } from "./invitation.service.js";
import type { CreateInvitationDto } from "./invitation.schema.js";

export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Create Invitation
   */
  createInvitation = requestHandler<AuthRequest<{}, CreateInvitationDto>>(
    async (req, res, next) => {
      try {
        const invitation = await this.invitationService.create(
          req.body,

          req.user,
        );

        return res.status(201).json({
          success: true,

          message: "Invitation sent successfully",

          data: invitation,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * List Invitations
   */
  listInvitations = requestHandler<AuthRequest>(async (req, res, next) => {
    try {
      const result = await this.invitationService.listInvitations(
        req.query,

        req.user,
      );

      return res.status(200).json({
        success: true,

        data: result.items,

        pagination: {
          total: result.total,

          page: result.page,

          limit: result.limit,

          pages: result.pages,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  getInvitation = requestHandler<AuthRequest<{ id: string }>>(
    async (req, res, next) => {
      try {
        const invitation = await this.invitationService.getInvitation(
          req.params.id,

          req.user,
        );

        return res.status(200).json({
          success: true,

          data: invitation,
        });
      } catch (error) {
        return next(error);
      }
    },
  );

  /**
   * Resend Invitation
   */
  resendInvitation = requestHandler<
    AuthRequest<{ id: string }, CreateInvitationDto>
  >(async (req, res, next) => {
    try {
      const invitation = await this.invitationService.resendInvitation(
        req.params.id,
        req.user,
      );

      return res.status(200).json({
        success: true,

        message: "Invitation resent successfully",

        data: invitation,
      });
    } catch (error) {
      return next(error);
    }
  });

  /**
   * Revoke Invitation
   */
  revokeInvitation = requestHandler<AuthRequest<{ id: string }>>(
    async (req, res, next) => {
      try {
        const invitation = await this.invitationService.revokeInvitation(
          req.params.id,

          req.user,
        );

        return res.status(200).json({
          success: true,

          message: "Invitation revoked successfully",

          data: invitation,
        });
      } catch (error) {
        return next(error);
      }
    },
  );
}
