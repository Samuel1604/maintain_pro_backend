import { InvitationService } from "@/modules/invitations/invitation.service.js";
import { InvitationRepository } from "@/modules/invitations/invitation.repository.js";
import { auditService } from "./audit.js";
import { userService } from "./user.js";
import { emailService } from "./email.js";


const invitation = new InvitationRepository();
export const invitationService = new InvitationService(invitation, userService, emailService, auditService);