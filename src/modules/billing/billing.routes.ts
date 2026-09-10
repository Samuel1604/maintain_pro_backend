import express, { Router } from "express";
import { authMiddleware } from "@/shared/middleware/authenticate.js";
import { requireVerifiedEmail } from "@/shared/middleware/require-verified-email.js";
import {
  createSubscription,
  getSubscription,
  activateSubscription,
  cancelSubscription,
  upgradePlan,
  downgradePlan,
  expireTrial,
  initiateCheckout,
  handleWebhook,
  getPaymentMethods,
  savePaymentMethod,
  removePaymentMethod,
  getPlanCatalog,
} from "./billing.controller.js";

const router = Router();

// ─── Webhook Callbacks (Public) ──────────────────────────────────────────────
router.post(
  "/webhooks/:provider",
  express.raw({ type: "*/*", limit: "1mb" }),
  handleWebhook,
);

// Public pricing metadata. It contains no tenant or provider secrets.
router.get("/plans", getPlanCatalog);

// ─── Authenticated Routes ───────────────────────────────────────────────────
router.use(authMiddleware);

// ─── Tenant-Scoped Subscription Operations (/subscription) ───────────────────
router.post("/subscription", requireVerifiedEmail, createSubscription);
router.get("/subscription", getSubscription);
router.post("/subscription/checkout", requireVerifiedEmail, initiateCheckout);
router.post("/subscription/cancel", requireVerifiedEmail, cancelSubscription);
router.patch("/subscription/upgrade", requireVerifiedEmail, upgradePlan);
router.patch("/subscription/downgrade", requireVerifiedEmail, downgradePlan);
router.get("/payment-methods", getPaymentMethods);
router.put("/payment-methods", requireVerifiedEmail, savePaymentMethod);
router.delete("/payment-methods/:id", requireVerifiedEmail, removePaymentMethod);

// ─── Explicit Subscription Operations (/subscriptions) ──────────────────────
router.post("/subscriptions", requireVerifiedEmail, createSubscription);
router.get("/subscriptions/:subscriptionId", getSubscription);
router.post("/subscriptions/:subscriptionId/activate", requireVerifiedEmail, activateSubscription);
router.post("/subscriptions/:subscriptionId/cancel", requireVerifiedEmail, cancelSubscription);
router.post("/subscriptions/:subscriptionId/expire-trial", requireVerifiedEmail, expireTrial);
router.patch("/subscriptions/:subscriptionId/upgrade", requireVerifiedEmail, upgradePlan);
router.patch("/subscriptions/:subscriptionId/downgrade", requireVerifiedEmail, downgradePlan);

export default router;
