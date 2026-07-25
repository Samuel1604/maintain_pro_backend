import { Router } from "express";
import {
  AuthController,
  OAuthController,
  SessionController,
  authService,
  oauthService,
  userService,
  sessionService,
} from "@/container/index.js";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { authLimiter, otpRateLimit } from "@/shared/middleware/rate-limit.js";

const router = Router();
const authController = new AuthController(authService, userService);
const oauthController = new OAuthController(oauthService, authService);
const sessionController = new SessionController(sessionService);

router.get("/oauth/:provider", oauthController.startOAuth);
router.get("/oauth/:provider/callback", oauthController.oauthCallback);

router.post("/register-org", authController.registerOrganization);
router.post("/register-ven", authController.registerVendor);
router.post("/accept-invitation", authController.acceptInvitation);

router.post("/login", authLimiter, authController.login);
router.post("/refresh", sessionController.refresh);
router.post("/logout", authMiddleware, sessionController.logout);
router.post("/logout-all", authMiddleware, sessionController.logoutAll);
router.post("/verify-otp", authController.verifyEmail);
router.post("/resend-otp", otpRateLimit, authController.resendOtp);

router.post("/forgot-password", otpRateLimit, authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/change-password", authMiddleware, authController.changePassword);
router.post(
  "/change-email",
  otpRateLimit,
  authMiddleware,
  authController.changeEmail,
);
router.post(
  "/verify-email-change",
  authMiddleware,
  authController.verifyEmailChange,
);

router.get("/sessions", authMiddleware, sessionController.getSession);
router.delete("/sessions/:id", authMiddleware, sessionController.revokeSession);

router.get("/me", authMiddleware, authController.me);

export default router;
