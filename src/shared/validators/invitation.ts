import { z } from "zod";

import { InvitationStatus } from "@/modules/invitations/invitation.types.js";

export const invitationStatusSchema = z.enum(
  Object.values(InvitationStatus),
);

export const invitationTokenSchema = z
  .string()
  .trim()
  .min(64, "Invitation token is invalid")
  .max(64, "Invitation token is invalid")
  .regex(/^[a-f0-9]+$/i, "Invitation token is invalid");

export const revokeReasonSchema = z.string().trim().min(2).max(255);
