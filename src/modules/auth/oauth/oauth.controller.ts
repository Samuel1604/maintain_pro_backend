import { requestHandler } from "@/shared/utils/request.js";
import type { Response } from "express";
import type { AuthRequest } from "@/shared/types/request.js";
import { AuthService } from "../auth.service.js";
import { OAuthService } from "./oauth.service.js";
import { AppError } from "@/shared/errors/AppError.js";
import { oauthConfig } from "@/config/oauth.config.js";
import { buildSessionMetadata } from "@/shared/utils/session.js";
import { setAuthCookies } from "@/config/cookie.config.js";
import { createOAuthState, verifyOAuthState } from "./oauth.utils.js";
import type { RegisterOrgDto, RegisterVendorDto } from "../dto/auth.dto.js";
import type { OAuthAction } from "./oauth.types.js";
import type { AuthProvider } from "@/shared/constants/auth-providers.js";
import type { AuthResponse } from "../auth.types.js";

export class OAuthController {
  constructor(
    private readonly service: OAuthService,
    private readonly authService: AuthService,
  ) {}

  private redirectToFrontend = (res: Response, auth: AuthResponse) => {
    setAuthCookies(res, auth.refreshToken, auth.sessionId);

    return res.redirect(`${oauthConfig.clientUrl}/oauth/success`);
  };

  startOAuth = requestHandler<
    AuthRequest<{ provider: AuthProvider }, {}, { action: OAuthAction }>
  >(async (req, res) => {
    const provider = req.params.provider;

    const action = req.query.action as OAuthAction;

    const state = createOAuthState({
      action,
    });

    const url = this.service.getAuthUrl(provider, state);

    return res.redirect(url);
  });

  oauthCallback = requestHandler<
    AuthRequest<{ provider: AuthProvider }, {}, { code: string; state: string }>
  >(async (req, res) => {
    const provider = req.params.provider;

    const code = req.query.code;

    const state = req.query.state;

    if (!code) {
      throw new AppError("Authorization code missing", 400);
    }

    const profile = await this.service.verify(provider, code);

    const payload = verifyOAuthState(state);

    const session = await buildSessionMetadata(req);

    let authResponse: AuthResponse;

    switch (payload.action) {
      case "login":
        authResponse = await this.authService.oauthLogin(
          profile,
          provider,
          session,
        );
        break;

      case "register-org":
        authResponse = await this.authService.oauthSignupOrganization(
          profile,
          provider,
          payload.signupData as RegisterOrgDto,
          session,
        );
        break;

      case "register-vendor":
        authResponse = await this.authService.oauthSignupVendor(
          profile,
          provider,
          payload.signupData as RegisterVendorDto,
          session,
        );
        break;

      case "accept-invitation":
        authResponse = await this.authService.acceptOAuthInvitation(
          profile,
          provider,
          payload.invitationToken!,
          session,
        );
        break;

      default:
        throw new AppError("Invalid OAuth action", 400);
    }

    return this.redirectToFrontend(res, authResponse);
  });
}
