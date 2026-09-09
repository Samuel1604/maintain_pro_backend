import type {
  OAuthRegisterOrgDto,
  OAuthRegisterVendorDto,
} from "../auth.schema.js";

export interface OAuthProfile {
  email: string;

  firstName: string;

  lastName: string;

  avatar: string | undefined;

  providerId: string;

  emailVerified: boolean;
}

export type OAuthAction =
  | "login"
  | "register-org"
  | "register-vendor"
  | "accept-invitation";

export interface OAuthState {
  nonce?: string;
  action: OAuthAction;
  invitationToken?: string;
  signupData?: OAuthRegisterOrgDto | OAuthRegisterVendorDto;
}
