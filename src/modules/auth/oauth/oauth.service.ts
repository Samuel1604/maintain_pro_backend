import { AppError } from "@/shared/errors/AppError.js";
import type { OAuthProfile } from "./oauth.types.js";
import type { AuthProvider } from "@/shared/constants/auth-providers.js";
import axios from "axios";
import { oauthConfig } from "@/config/oauth.config.js";
import { URLSearchParams } from "url";

export class OAuthService {
  getGoogleAuthUrl(state: string) {
    const params = new URLSearchParams({
      client_id: oauthConfig.google.clientId ?? "",
      redirect_uri: oauthConfig.google.redirectUri ?? "",
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeGoogleCode(code: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://oauth2.googleapis.com/token",

        new URLSearchParams({
          code,

          client_id: oauthConfig.google.clientId,

          client_secret: oauthConfig.google.clientSecret,

          redirect_uri: oauthConfig.google.redirectUri,

          grant_type: "authorization_code",
        }),

        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      return response.data.access_token;
    } catch {
      throw new AppError("Failed to exchange Google code", 401);
    }
  }

  async getGoogleProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const response = await axios.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const profile = response.data;

      return {
        email: profile.email,

        firstName: profile.given_name ?? "",

        lastName: profile.family_name ?? "",

        avatar: profile.picture,

        providerId: profile.sub,
      };
    } catch {
      throw new AppError("Failed to fetch Google profile", 401);
    }
  }

  async verifyGoogleUser(code: string): Promise<OAuthProfile> {
    const accessToken = await this.exchangeGoogleCode(code);

    return this.getGoogleProfile(accessToken);
  }

  async verifyGoogleCallback(code: string): Promise<OAuthProfile> {
    const idToken = await this.exchangeGoogleCode(code);

    return this.verifyGoogleUser(idToken);
  }

  getLinkedInAuthUrl(state: string) {
    const params = new URLSearchParams({
      response_type: "code",

      client_id: oauthConfig.linkedin.clientId ?? "",

      redirect_uri: oauthConfig.linkedin.clientRedirect ?? "",

      scope: "openid profile email",

      state,
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async exchangeLinkedInCode(code: string): Promise<string> {
    try {
      const response = await axios.post(
        "https://www.linkedin.com/oauth/v2/accessToken",

        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: oauthConfig.linkedin.clientId ?? "",
          client_secret: oauthConfig.linkedin.clientSecret ?? "",
          redirect_uri: oauthConfig.linkedin.clientRedirect ?? "",
        }),

        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      return response.data.access_token;
    } catch {
      throw new AppError("Failed to exchange LinkedIn code", 401);
    }
  }

  async getLinkedInProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const response = await axios.get(
        "https://api.linkedin.com/v2/userinfo",

        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const profile = response.data;

      return {
        email: profile.email,

        firstName: profile.given_name ?? "",

        lastName: profile.family_name ?? "",

        avatar: profile.picture,

        providerId: profile.sub,
      };
    } catch {
      throw new AppError("Failed to fetch LinkedIn profile", 401);
    }
  }

  async verifyLinkedInUser(code: string): Promise<OAuthProfile> {
    const accessToken = await this.exchangeLinkedInCode(code);

    return this.getLinkedInProfile(accessToken);
  }

  async verifyLinkedInCallback(code: string): Promise<OAuthProfile> {
    const idToken = await this.exchangeLinkedInCode(code);

    return this.verifyLinkedInUser(idToken);
  }

  async verify(provider: AuthProvider, code: string): Promise<OAuthProfile> {
    switch (provider) {
      case "google":
        return this.verifyGoogleUser(code);

      case "linkedin":
        return this.verifyLinkedInUser(code);

      default:
        throw new AppError("Unsupported provider", 400);
    }
  }

  getAuthUrl(provider: AuthProvider, state: string) {
    switch (provider) {
      case "google":
        return this.getGoogleAuthUrl(state);

      case "linkedin":
        return this.getLinkedInAuthUrl(state);

      default:
        throw new AppError("Unsupported provider", 400);
    }
  }
}
