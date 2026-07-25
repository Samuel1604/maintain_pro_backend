import type { RegisterOrgDto, RegisterVendorDto } from "../dto/auth.dto.js";

export interface OAuthProfile {
  email: string;

  firstName: string;

  lastName: string;

  avatar: string | undefined;

  providerId: string;
}

export type OAuthAction =
  | "login"
  | "register-org"
  | "register-vendor"
  | "accept-invitation";

export interface OAuthState {
  action: OAuthAction;
  invitationToken?: string;
  signupData?: RegisterOrgDto | RegisterVendorDto;
}
