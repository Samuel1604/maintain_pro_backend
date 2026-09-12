import { Router } from "express";
import {
  authService,
  oauthService,
  userService,
  sessionService,
} from "@/container/index.js";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import {
  authLimiter,
  otpRateLimit,
  otpVerifyLimiter,
  refreshLimiter,
  registrationLimiter,
  securityMutationLimiter,
} from "@/shared/middleware/rate-limit.js";
import { validate } from "@/shared/middleware/validate.js";
import {
  loginSchema,
  registerOrgSchema,
  registerVendorSchema,
} from "./auth.schema.js";
import { resendOtpSchema, verifyOtpSchema } from "./otp/otp.schema.js";
import { verifyLinkSchema, regenerateVerificationSchema } from "./verification-link/verification-link.schema.js";
import {
  changeEmailSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailChangeSchema,
} from "@/modules/security/security.schema.js";
import { acceptInvitationSchema } from "@/modules/invitations/invitation.schema.js";
import { revokeSessionParamsSchema } from "./session/session.schema.js";
import { AuthController } from "./auth.controller.js";
import { OAuthController } from "./oauth/oauth.controller.js";
import { SessionController } from "./session/session.controller.js";

const router = Router();
const authController = new AuthController(authService, userService);
const oauthController = new OAuthController(oauthService, authService);
const sessionController = new SessionController(sessionService);

router.get("/oauth/:provider", oauthController.startOAuth);
router.get("/oauth/:provider/callback", oauthController.oauthCallback);

router.post(
  "/register/organization",
  registrationLimiter,
  validate(registerOrgSchema),
  authController.registerOrganization,
);
router.post(
  "/register/vendor",
  registrationLimiter,
  validate(registerVendorSchema),
  authController.registerVendor,
);
router.post(
  "/accept-invitation",
  registrationLimiter,
  validate(acceptInvitationSchema),
  authController.acceptInvitation,
);

router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh", refreshLimiter, sessionController.refresh);
router.post("/logout", authMiddleware, sessionController.logout);
router.post("/logout-all", authMiddleware, sessionController.logoutAll);
router.post(
  "/verify-otp",
  otpVerifyLimiter,
  validate(verifyOtpSchema),
  authController.verifyEmail,
);
router.post(
  "/resend-otp",
  otpRateLimit,
  validate(resendOtpSchema),
  authController.resendOtp,
);

// ─── Link-based Verification (default strategy) ──────────────────────────────
router.post(
  "/verify-link",
  otpVerifyLimiter,
  validate(verifyLinkSchema),
  authController.verifyEmailLink,
);
router.post(
  "/regenerate-verification",
  otpRateLimit,
  validate(regenerateVerificationSchema),
  authController.regenerateVerificationLink,
);

router.post(
  "/forgot-password",
  otpRateLimit,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  otpRateLimit,
  validate(resetPasswordSchema),
  authController.resetPassword,
);
router.post(
  "/change-password",
  authMiddleware,
  securityMutationLimiter,
  validate(changePasswordSchema),
  authController.changePassword,
);
router.post(
  "/change-email",
  otpRateLimit,
  authMiddleware,
  validate(changeEmailSchema),
  authController.changeEmail,
);
router.post(
  "/verify-email-change",
  authMiddleware,
  securityMutationLimiter,
  validate(verifyEmailChangeSchema),
  authController.verifyEmailChange,
);

router.get("/sessions", authMiddleware, sessionController.getSession);
router.delete(
  "/sessions/:id",
  authMiddleware,
  validate(revokeSessionParamsSchema),
  sessionController.revokeSession,
);

router.get("/me", authMiddleware, authController.me);

export default router;
