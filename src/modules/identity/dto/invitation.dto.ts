export * from "@/modules/invitations/invitation.schema.js";

export interface AcceptGoogleInvitationDto {
  invitationToken: string;
  code: string;
}

export interface AcceptLinkedInInvitationDto {
  invitationToken: string;
  code: string;
}
