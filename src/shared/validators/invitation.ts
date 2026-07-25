import { z } from "zod";

import { InvitationStatus } from "@/modules/invitations/invitation.types.js";

export const invitationStatusSchema = z.enum(
  Object.values(InvitationStatus),
);

export const invitationTokenSchema = z.string().trim().min(1);

export const revokeReasonSchema = z.string().trim().min(2).max(255);