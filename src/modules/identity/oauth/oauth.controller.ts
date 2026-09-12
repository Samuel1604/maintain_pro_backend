import { requestHandler } from "@/shared/utils/request.js";
import type { Response } from "express";
import type { AuthRequest } from "@/shared/types/request.js";
import { AuthService } from "../auth.service.js";
import { OAuthService } from "./oauth.service.js";
import { ValidationException, BusinessException } from "@/shared/errors/index.js";
import { oauthConfig } from "@/config/oauth.config.js";
import { buildSessionMetadata } from "@/shared/utils/session.js";
import { setAuthCookies } from "@/config/cookie.config.js";
import { createOAuthState, verifyOAuthState, saveOAuthState, consumeOAuthState } from "./oauth.utils.js";
import {
  oauthRegisterOrgDataParser,
  oauthRegisterVendorDataParser,
} from "../auth.schema.js";
import type {
  OAuthRegisterOrgDto,
  OAuthRegisterVendorDto,
} from "../auth.schema.js";
import type { OAuthAction } from "./oauth.types.js";
import type { AuthProvider } from "@/shared/constants/auth-providers.js";
import type { AuthResponse } from "../auth.types.js";
import { randomUUID } from "node:crypto";

interface StartOAuthQuery {
  action: OAuthAction;
  /** Required when action === "accept-invitation" */
  invitationToken?: string;
  /**
   * Required when action is "register-org" or "register-vendor".
   * A JSON-encoded object (URI-component-encoded) matching
   * OAuthRegisterOrgDto / OAuthRegisterVendorDto — never include a
   * password field here, it has no meaning for an OAuth signup and
   * this data is briefly reflected through a redirect URL.
   */
  signupData?: string;
}

export class OAuthController {
  constructor(
    private readonly service: OAuthService,
    private readonly authService: AuthService,
  ) {}

  private redirectToFrontend = (res: Response, auth: AuthResponse) => {
    setAuthCookies(res, auth.accessToken, auth.refreshToken, auth.sessionId);

    return res.redirect(`${oauthConfig.clientUrl}/oauth/success`);
  };

  startOAuth = requestHandler<
    AuthRequest<{ provider: AuthProvider }, Record<string, never>, StartOAuthQuery>
  >(async (req, res) => {
    const provider = req.params.provider;

    let action: OAuthAction = "login";
    if (req.query.action && ["login", "register-org", "register-vendor", "accept-invitation"].includes(req.query.action)) {
      action = req.query.action as OAuthAction;
    }

    let invitationToken: string | undefined;
    let signupData: OAuthRegisterOrgDto | OAuthRegisterVendorDto | undefined;

    switch (action) {
      case "register-org":
      case "register-vendor": {
        if (!req.query.signupData) {
          throw new ValidationException(
            "Signup details are required to continue with this provider",
          );
        }

        let parsedInput: unknown;

        try {
          parsedInput = JSON.parse(req.query.signupData);
        } catch {
          throw new ValidationException("Invalid signup details");
        }

        const parser =
          action === "register-org"
            ? oauthRegisterOrgDataParser
            : oauthRegisterVendorDataParser;

        const result = parser.safeParse(parsedInput);

        if (!result.success) {
          throw new ValidationException("Invalid signup details");
        }

        signupData = result.data;
        break;
      }

      case "accept-invitation": {
        if (!req.query.invitationToken) {
          throw new ValidationException(
            "An invitation token is required to continue with this provider",
          );
        }

        invitationToken = req.query.invitationToken;
        break;
      }

      case "login":
        break;

      default:
        throw new BusinessException("Invalid OAuth action");
    }

    const nonce = randomUUID();
    const state = createOAuthState({
      nonce,
      action,
      invitationToken,
      signupData,
    });

    await saveOAuthState(nonce, state);
    res.cookie("oauthStateNonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      path: "/api/v1/auth/oauth",
    });
    const url = this.service.getAuthUrl(provider, state);

    return res.redirect(url);
  });

  oauthCallback = requestHandler<
    AuthRequest<{ provider: AuthProvider }, Record<string, never>, { code: string; state: string }>
  >(async (req, res) => {
    const provider = req.params.provider;

    const code = req.query.code;

    const state = req.query.state;

    if (!code) {
      throw new ValidationException("Authorization code missing");
    }

    const payload = verifyOAuthState(state);
    if (!payload.nonce || payload.nonce !== req.cookies?.oauthStateNonce) {
      throw new ValidationException("OAuth state does not match the initiating browser session");
    }
    const consumed = await consumeOAuthState(payload.nonce, state);
    if (!consumed) throw new ValidationException("OAuth state is invalid or has already been used");
    res.clearCookie("oauthStateNonce", { path: "/api/v1/auth/oauth" });

    // Reject forged, replayed, or cross-browser callbacks before exchanging
    // the provider code. This avoids unnecessary provider calls and ensures
    // the callback is bound to the browser session that initiated it.
    const profile = await this.service.verify(provider, code);

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
        if (!payload.signupData) {
          throw new ValidationException("Signup details missing from OAuth state");
        }

        authResponse = await this.authService.oauthSignupOrganization(
          profile,
          provider,
          payload.signupData as OAuthRegisterOrgDto,
          session,
        );
        break;

      case "register-vendor":
        if (!payload.signupData) {
          throw new ValidationException("Signup details missing from OAuth state");
        }

        authResponse = await this.authService.oauthSignupVendor(
          profile,
          provider,
          payload.signupData as OAuthRegisterVendorDto,
          session,
        );
        break;

      case "accept-invitation":
        if (!payload.invitationToken) {
          throw new ValidationException("Invitation token missing from OAuth state");
        }

        authResponse = await this.authService.acceptOAuthInvitation(
          profile,
          provider,
          payload.invitationToken,
          session,
        );
        break;

      default:
        throw new BusinessException("Invalid OAuth action");
    }

    return this.redirectToFrontend(res, authResponse);
  });
}
