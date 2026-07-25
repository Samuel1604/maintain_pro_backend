export interface AcceptInvitationDto {
  token: string;

  firstName: string;

  lastName: string;

  password: string;
}

export interface AcceptGoogleInvitationDto {
  invitationToken: string;

  code: string;
}

export interface AcceptLinkedInInvitationDto {
  invitationToken: string;

  code: string;
}