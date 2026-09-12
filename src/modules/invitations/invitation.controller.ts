import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { InvitationService } from "./invitation.service.js";
import type {
  CreateInvitationDto,
  CreateTempInvitationDto,
  ListInvitationsDto,
  InvitationIdParamsDto,
} from "./invitation.schema.js";

export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Create Invitation
   */
  createInvitation = requestHandler<AuthRequest<Record<string, never>, CreateInvitationDto>>(
    async (req, res) => {
      const result = await this.invitationService.create(
        req.validated.body,
        req.user,
      );

      return res.created(result.data, result.message);
    },
  );

  /**
   * List Invitations
   */
  listInvitations = requestHandler<
    AuthRequest<Record<string, never>, Record<string, never>, ListInvitationsDto>
  >(async (req, res) => {
    const result = await this.invitationService.listInvitations(
      req.validated.query,
      req.user,
    );

    return res.paginated(result.data, result.meta, result.message);
  });

  getInvitation = requestHandler<AuthRequest<InvitationIdParamsDto>>(
    async (req, res) => {
      const { id } = req.validated.params;
      const result = await this.invitationService.getInvitation(
        id,
        req.user,
      );

      return res.ok(result.data, result.message);
    },
  );

  /**
   * Resend Invitation
   */
  resendInvitation = requestHandler<AuthRequest<InvitationIdParamsDto>>(
    async (req, res) => {
      const { id } = req.validated.params;
      const result = await this.invitationService.resendInvitation(
        id,
        req.user,
      );

      return res.ok(result.data, result.message);
    },
  );

  /**
   * Revoke Invitation
   */
  revokeInvitation = requestHandler<AuthRequest<InvitationIdParamsDto>>(
    async (req, res) => {
      const { id } = req.validated.params;
      const result = await this.invitationService.revokeInvitation(
        id,
        req.user,
      );

      return res.ok(result.data, result.message);
    },
  );

  /**
   * Create Temp Invitation (system-generated password, 15-min TTL)
   * Actor (admin/vendor_lead) gets credentials back once — shares them securely.
   */
  createTempInvitation = requestHandler<AuthRequest<Record<string, never>, CreateTempInvitationDto>>(
    async (req, res) => {
      const result = await this.invitationService.createTempUserInvitation(
        req.validated.body,
        req.user,
      );
      return res.created(result.data, result.message);
    },
  );
}
