import { requestHandler } from "@/shared/utils/request.js";
import { AuthService } from "./auth.service.js";
import type { AuthResponse } from "./auth.types.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { buildSessionMetadata } from "@/shared/utils/session.js";
import { setAuthCookies } from "@/config/cookie.config.js";
import { successResponse } from "@/shared/utils/response.js";
import { UserService } from "../users/user.service.js";

export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly userService: UserService,
  ) {}

  private buildAuthResponse(auth: AuthResponse) {
    return {
      accessToken: auth.accessToken,
      user: auth.user,
    };
  }

  // =================================
  // ORGANIZATION REGISTRATION
  // =================================
  registerOrganization = requestHandler<AuthRequest>(async (req, res) => {
    const session = await buildSessionMetadata(req);
    const result = await this.service.registerOrganization(
      req.validated.body,
      session,
    );

    setAuthCookies(res, result.refreshToken, result.sessionId);
    return successResponse(
      res,
      this.buildAuthResponse(result),
      "Organization registered successfully. Please verify your email.",
      201,
    );
  });

  // =================================
  // VENDOR REGISTRATION
  // =================================
  registerVendor = requestHandler<AuthRequest>(async (req, res) => {
    const session = await buildSessionMetadata(req);
    const result = await this.service.registerVendor(
      req.validated.body,
      session,
    );

    setAuthCookies(res, result.refreshToken, result.sessionId);
    return successResponse(
      res,
      this.buildAuthResponse(result),
      "Vendor registered successfully. Please verify your email.",
      201,
    );
  });

  // =================================
  // ACCEPT INVITATION
  // =================================
  acceptInvitation = requestHandler<AuthRequest>(async (req, res) => {
    const session = await buildSessionMetadata(req);
    const result = await this.service.acceptInvitation(
      req.validated.body,
      session,
    );

    setAuthCookies(res, result.refreshToken, result.sessionId);
    return successResponse(
      res,
      this.buildAuthResponse(result),
      "Invitation accepted successfully.",
      201,
    );
  });

  // =================================
  // RESEND OTP
  // =================================
  resendOtp = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.service.resendVerificationOtp(
      req.validated.body.email,
    );

    return res.status(200).json({
      success: true,
      data: result,
      message: "Otp sent successfully",
    });
  });

  // =================================
  // VERIFY EMAIL
  // =================================
  verifyEmail = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.service.verifyEmail(
      req.validated.body.email,
      req.validated.body.otp,
    );

    return successResponse(res, {}, result?.message);
  });

  // =================================
  // LOGIN
  // =================================
  login = requestHandler<AuthRequest>(async (req, res) => {
    const session = await buildSessionMetadata(req);

    const auth: AuthResponse = await this.service.login(
      req.validated.body,
      session,
    );

    setAuthCookies(res, auth.refreshToken, auth.sessionId);

    return successResponse(
      res,
      this.buildAuthResponse(auth),
      "Login successful",
    );
  });

  // =================================
  // CURRENT USER
  // =================================
  me = requestHandler<AuthRequest>(async (req, res) => {
    const user = await this.userService.me(req.user.userId);

    return successResponse(res, user, "User fetched successfully", 200);
  });

  // ================================
  // FORGOT PASSWORD
  // ================================
  forgotPassword = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.userService.requestResetPassword(
      req.validated.body.email,
      req.ip ?? "Unknown",
    );

    return successResponse(res, {}, result.message);
  });

  // ================================
  // CHANGE PASSWORD
  // ================================
  changePassword = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.userService.changePassword(
      req.user.userId,
      req.validated.body.currentPassword,
      req.validated.body.newPassword,
    );

    return successResponse(res, {}, result.message);
  });

  // =================================
  // RESET PASSWORD
  // =================================
  resetPassword = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.userService.resetPassword(
      req.validated.body.email,
      req.validated.body.otp,
      req.validated.body.newPassword,
    );

    return successResponse(res, {}, result.message);
  });

  // ===============================
  // CHANGE EMAIL
  // ===============================
  changeEmail = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.userService.requestEmailChange(
      req.user.userId,
      req.validated.body.newEmail,
      req.ip ?? "Unknown",
    );

    return successResponse(res, {}, result.message);
  });

  // ===============================
  // VERIFY EMAIL
  // ===============================

  verifyEmailChange = requestHandler<AuthRequest>(async (req, res) => {
    const result = await this.userService.changeEmail(
      req.user.userId,
      req.validated.body.otp,
    );

    return successResponse(res, {}, result.message);
  });
}
