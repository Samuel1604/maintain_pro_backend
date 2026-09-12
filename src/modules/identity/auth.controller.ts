import { requestHandler } from "@/shared/utils/request.js";
import { AuthService } from "./auth.service.js";
import type { AuthResponse } from "./auth.types.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { buildSessionMetadata } from "@/shared/utils/session.js";
import { setAuthCookies } from "@/config/cookie.config.js";
import { UserService } from "../users/user.service.js";
import { AuthenticationException } from "@/shared/errors/index.js";
import type {
  LoginDto,
  RegisterOrgDto,
  RegisterVendorDto,
} from "./auth.schema.js";
import type { ResendOtpDto, VerifyOtpDto } from "./otp/otp.schema.js";
import type { VerifyLinkDto, RegenerateVerificationDto } from "./verification-link/verification-link.schema.js";
import type {
  ChangeEmailDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailChangeDto,
} from "@/modules/security/security.schema.js";
import type { AcceptInvitationDto } from "@/modules/invitations/invitation.schema.js";

export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly userService: UserService,
  ) {}

  private buildAuthResponse(auth: AuthResponse) {
    // accessToken/refreshToken are never sent in the response body —
    // they're set as httpOnly cookies by setAuthCookies() so client-side
    // JS never has direct access to them (XSS containment).
    return {
      user: auth.user,
    };
  }

  // =================================
  // ORGANIZATION REGISTRATION
  // =================================
  registerOrganization = requestHandler<
    AuthRequest<Record<string, never>, RegisterOrgDto>
  >(async (req, res) => {
    const session = await buildSessionMetadata(req);
    const result = await this.service.registerOrganization(
      req.validated.body,
      session,
    );
    const auth = result.data;
    if (!auth) throw new AuthenticationException("Authentication failed");

    setAuthCookies(res, auth.accessToken, auth.refreshToken, auth.sessionId);
    return res.created(
      this.buildAuthResponse(auth),
      "Organization registered successfully. Please verify your email.",
    );
  });

  // =================================
  // VENDOR REGISTRATION
  // =================================
  registerVendor = requestHandler<
    AuthRequest<Record<string, never>, RegisterVendorDto>
  >(async (req, res) => {
    const session = await buildSessionMetadata(req);
    const result = await this.service.registerVendor(
      req.validated.body,
      session,
    );
    const auth = result.data;
    if (!auth) throw new AuthenticationException("Authentication failed");

    setAuthCookies(res, auth.accessToken, auth.refreshToken, auth.sessionId);
    return res.created(
      this.buildAuthResponse(auth),
      "Vendor registered successfully. Please verify your email.",
    );
  });

  // =================================
  // ACCEPT INVITATION
  // =================================
  acceptInvitation = requestHandler<
    AuthRequest<Record<string, never>, AcceptInvitationDto>
  >(async (req, res) => {
    const session = await buildSessionMetadata(req);
    const result = await this.service.acceptInvitation(
      req.validated.body,
      session,
    );
    const auth = result.data;
    if (!auth) throw new AuthenticationException("Authentication failed");

    setAuthCookies(res, auth.accessToken, auth.refreshToken, auth.sessionId);
    return res.created(
      this.buildAuthResponse(auth),
      "Invitation accepted successfully.",
    );
  });

  // =================================
  // RESEND OTP
  // =================================
  resendOtp = requestHandler<AuthRequest<Record<string, never>, ResendOtpDto>>(
    async (req, res) => {
      const { email } = req.validated.body;
      const result = await this.service.resendVerificationOtp(email);

      return res.ok(result.data, result.message);
    },
  );

  // =================================
  // VERIFY EMAIL (OTP strategy)
  // =================================
  verifyEmail = requestHandler<
    AuthRequest<Record<string, never>, VerifyOtpDto>
  >(async (req, res) => {
    const { email, otp } = req.validated.body;
    const result = await this.service.verifyEmail(email, otp);

    return res.ok(result.data, result.message);
  });

  // =================================
  // VERIFY EMAIL BY LINK (link strategy)
  // =================================
  verifyEmailLink = requestHandler<
    AuthRequest<Record<string, never>, VerifyLinkDto>
  >(async (req, res) => {
    const { email, token } = req.validated.body;
    const result = await this.service.verifyEmailByLink(email, token);
    return res.ok(result.data, result.message);
  });

  // =================================
  // REGENERATE VERIFICATION LINK (link strategy)
  // =================================
  regenerateVerificationLink = requestHandler<
    AuthRequest<Record<string, never>, RegenerateVerificationDto>
  >(async (req, res) => {
    const { email } = req.validated.body;
    const result = await this.service.regenerateVerificationLink(email);
    return res.ok(result.data, result.message);
  });

  // =================================
  // LOGIN
  // =================================
  login = requestHandler<AuthRequest<Record<string, never>, LoginDto>>(
    async (req, res) => {
      const session = await buildSessionMetadata(req);

      const result = await this.service.login(req.validated.body, session);
      const auth = result.data;
      if (!auth) throw new AuthenticationException("Authentication failed");

      setAuthCookies(res, auth.accessToken, auth.refreshToken, auth.sessionId);

      return res.ok(this.buildAuthResponse(auth), result.message);
    },
  );

  // =================================
  // CURRENT USER
  // =================================
  me = requestHandler<AuthRequest>(async (req, res) => {
    const user = await this.service.getCurrentUser(req.user.userId);
    if (!user) throw new AuthenticationException("User not found");
    return res.ok(user, "User fetched successfully");
  });

  // ================================
  // FORGOT PASSWORD
  // ================================
  forgotPassword = requestHandler<
    AuthRequest<Record<string, never>, ForgotPasswordDto>
  >(async (req, res) => {
    const { email } = req.validated.body;
    const result = await this.userService.requestResetPassword(
      email,
      req.ip ?? "Unknown",
    );

    return res.ok({}, result.message);
  });

  // ================================
  // CHANGE PASSWORD
  // ================================
  changePassword = requestHandler<
    AuthRequest<Record<string, never>, ChangePasswordDto>
  >(async (req, res) => {
    const { currentPassword, newPassword } = req.validated.body;
    const result = await this.userService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword,
    );

    return res.ok({}, result.message);
  });

  // =================================
  // RESET PASSWORD
  // =================================
  resetPassword = requestHandler<
    AuthRequest<Record<string, never>, ResetPasswordDto>
  >(async (req, res) => {
    const { email, otp, newPassword } = req.validated.body;
    const result = await this.userService.resetPassword(
      email,
      otp,
      newPassword,
    );

    return res.ok({}, result.message);
  });

  // ===============================
  // CHANGE EMAIL
  // ===============================
  changeEmail = requestHandler<
    AuthRequest<Record<string, never>, ChangeEmailDto>
  >(async (req, res) => {
    const { newEmail } = req.validated.body;
    const result = await this.userService.requestEmailChange(
      req.user.userId,
      newEmail,
      req.ip ?? "Unknown",
    );

    return res.ok({}, result.message);
  });

  // ===============================
  // VERIFY EMAIL
  // ===============================

  verifyEmailChange = requestHandler<
    AuthRequest<Record<string, never>, VerifyEmailChangeDto>
  >(async (req, res) => {
    const { otp } = req.validated.body;
    const result = await this.userService.changeEmail(req.user.userId, otp);

    return res.ok({}, result.message);
  });
}
