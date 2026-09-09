import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import type { Request, Response } from "express";
import { ROLES } from "@/shared/constants/roles.js";
import { AuthenticationException, AuthorizationException, ConflictException, ValidationException } from "@/shared/errors/index.js";
import { BillingService } from "./billing.service.js";
import { PAYMENT_PROVIDERS } from "./enums/payment-provider.enum.js";
import {
  createSubscriptionSchema,
  changePlanSchema,
} from "./billing.schema.js";
import { PaymentMethodService } from "./payments/payment-method.service.js";
import { paymentMethodSchema } from "./payments/payment-method.schema.js";

const service = new BillingService();
const paymentMethodService = new PaymentMethodService();

function getCallerTenantOwner(req: AuthRequest): { ownerId: string; ownerType: "organization" | "vendor" } {
  const user = req.user;
  if (!user) {
    throw new AuthenticationException("Unauthorized");
  }

  if (user.role !== ROLES.ADMIN && user.role !== ROLES.VENDOR_LEAD) {
    throw new AuthorizationException("Only organization admins or vendor leads can modify billing subscriptions.");
  }

  if (user.role === ROLES.ADMIN || user.organizationId) {
    if (!user.organizationId) {
      throw new ValidationException("Organization ID is required for organization billing.");
    }
    return { ownerId: user.organizationId, ownerType: "organization" };
  }

  if (user.role === ROLES.VENDOR_LEAD || user.vendorId) {
    if (!user.vendorId) {
      throw new ValidationException("Vendor ID is required for vendor billing.");
    }
    return { ownerId: user.vendorId, ownerType: "vendor" };
  }

  throw new AuthorizationException("User is not associated with an organization or vendor.");
}

function getCallerTenantContext(req: AuthRequest): { ownerId: string; ownerType: "organization" | "vendor" } {
  const user = req.user;
  if (!user) {
    throw new AuthenticationException("Unauthorized");
  }

  if (user.organizationId) {
    return { ownerId: user.organizationId, ownerType: "organization" };
  }
  if (user.vendorId) {
    return { ownerId: user.vendorId, ownerType: "vendor" };
  }

  throw new AuthorizationException("User is not associated with an organization or vendor.");
}

export const getPaymentMethods = requestHandler<AuthRequest>(async (req, res) => {
  return res.ok(await paymentMethodService.get(getCallerTenantContext(req)), "Payment methods retrieved");
});
export const savePaymentMethod = requestHandler<AuthRequest>(async (req, res) => {
  const tenant = getCallerTenantOwner(req);
  const subscription = await service.findSubscriptionByOwnerOptional(tenant.ownerId, tenant.ownerType);
  if (subscription) {
    throw new ConflictException("Payment methods can only be changed before a subscription is active.");
  }
  return res.ok(await paymentMethodService.upsert(paymentMethodSchema.parse(req.body), tenant), "Payment method saved");
});
export const removePaymentMethod = requestHandler<AuthRequest<{ id: string }>>(async (req, res) => {
  return res.ok(await paymentMethodService.remove(req.params.id, getCallerTenantOwner(req)), "Payment method removed");
});

// ─── Create Subscription ──────────────────────────────────────────────────────

export const createSubscription = requestHandler<AuthRequest>(
  async (req, res) => {
    const tenant = getCallerTenantOwner(req);
    const cycleParam = (req.query.billingCycle || req.query.cycle || req.body?.billingCycle || req.body?.cycle) as string | undefined;
    const bodyWithCycle = {
      ...req.body,
      ...(cycleParam ? { billingCycle: cycleParam } : {}),
    };

    const parsed = createSubscriptionSchema.parse(bodyWithCycle);
    const input = {
      ...parsed,
      ownerType: tenant.ownerType,
      ownerId: tenant.ownerId,
    };

    const subscriptionDto = await service.createSubscription(input);

    return res.created(subscriptionDto);
  },
);

// ─── Get Subscription ─────────────────────────────────────────────────────────

export const getSubscription = requestHandler<
  AuthRequest<{ subscriptionId?: string }>
>(async (req, res) => {
  if (req.params.subscriptionId) {
    const subscriptionDto = await service.findSubscription(req.params.subscriptionId, req.user);
    return res.ok(subscriptionDto);
  }

  const tenant = getCallerTenantContext(req);
  const subscriptionDto = await service.findSubscriptionByOwnerOptional(tenant.ownerId, tenant.ownerType);

  return res.ok(subscriptionDto);
});

// ─── Checkout ─────────────────────────────────────────────────────────────────

export const initiateCheckout = requestHandler<AuthRequest>(
  async (req, res) => {
    const tenant = getCallerTenantOwner(req);
    let subDto = await service.findSubscriptionByOwner(tenant.ownerId, tenant.ownerType);

    const cycleParam = (req.query.billingCycle || req.query.cycle || req.body?.billingCycle || req.body?.cycle) as string | undefined;
    if (cycleParam === "monthly" || cycleParam === "annual") {
      subDto = await service.updateSubscriptionCycle(subDto.id, cycleParam);
    }

    const provider = req.body?.provider || req.query?.provider;
    const result = await service.initiateCheckout(subDto.id, provider);

    return res.ok(result);
  },
);

// ─── Webhook Handler ──────────────────────────────────────────────────────────

export const handleWebhook = requestHandler(
  async (req: Request, res: Response) => {
    const provider = req.params.provider as string;
    if (!PAYMENT_PROVIDERS.includes(provider as (typeof PAYMENT_PROVIDERS)[number])) {
      throw new ValidationException(`Unsupported payment webhook provider: ${provider}`);
    }
    const parsedBody = req.body as { type?: string; data?: number[] } | undefined;
    const bodyBuffer = Buffer.isBuffer(req.body) ? req.body :
      (parsedBody?.type === "Buffer" && Array.isArray(parsedBody.data)
        ? Buffer.from(parsedBody.data)
        : (req as Request & { rawBody?: Buffer }).rawBody ??
          Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body)));

    const signature = (req.headers["x-mock-signature"] ||
      req.headers["stripe-signature"] ||
      req.headers["x-paystack-signature"] ||
      req.headers["verif-hash"] ||
      req.headers["x-flutterwave-signature"]) as string | undefined;

    const result = await service.handleWebhook(provider, bodyBuffer, signature);
    return res.ok(result);
  },
);

// ─── Activate Subscription ────────────────────────────────────────────────────

export const activateSubscription = requestHandler<
  AuthRequest<{ subscriptionId?: string }>
>(async (req, res) => {
  let subId = req.params.subscriptionId;
  if (!subId) {
    const tenant = getCallerTenantOwner(req);
    const subDto = await service.findSubscriptionByOwner(tenant.ownerId, tenant.ownerType);
    subId = subDto.id;
  }

  await service.assertSubscriptionOwnership(subId, req.user);

  const subscriptionDto = await service.activateSubscription(subId);
  return res.ok(subscriptionDto);
});

// ─── Cancel Subscription ──────────────────────────────────────────────────────

export const cancelSubscription = requestHandler<
  AuthRequest<{ subscriptionId?: string }>
>(async (req, res) => {
  let subId = req.params.subscriptionId;
  if (!subId) {
    const tenant = getCallerTenantOwner(req);
    const subDto = await service.findSubscriptionByOwner(tenant.ownerId, tenant.ownerType);
    subId = subDto.id;
  }

  await service.assertSubscriptionOwnership(subId, req.user);

  const subscriptionDto = await service.cancelSubscription(subId);
  return res.ok(subscriptionDto);
});

// ─── Upgrade Plan ─────────────────────────────────────────────────────────────

export const upgradePlan = requestHandler<
  AuthRequest<{ subscriptionId?: string }>
>(async (req, res) => {
  let subId = req.params.subscriptionId;
  if (!subId) {
    const tenant = getCallerTenantOwner(req);
    const subDto = await service.findSubscriptionByOwner(tenant.ownerId, tenant.ownerType);
    subId = subDto.id;
  }

  await service.assertSubscriptionOwnership(subId, req.user);

  const cycleParam = (req.query.billingCycle || req.query.cycle || req.body?.billingCycle || req.body?.cycle) as string | undefined;
  const bodyWithCycle = {
    ...req.body,
    ...(cycleParam ? { billingCycle: cycleParam } : {}),
  };

  const input = changePlanSchema.parse(bodyWithCycle);
  const subscriptionDto = await service.upgradePlan(subId, input);

  return res.ok(subscriptionDto);
});

// ─── Downgrade Plan ───────────────────────────────────────────────────────────

export const downgradePlan = requestHandler<
  AuthRequest<{ subscriptionId?: string }>
>(async (req, res) => {
  let subId = req.params.subscriptionId;
  if (!subId) {
    const tenant = getCallerTenantOwner(req);
    const subDto = await service.findSubscriptionByOwner(tenant.ownerId, tenant.ownerType);
    subId = subDto.id;
  }

  await service.assertSubscriptionOwnership(subId, req.user);

  const cycleParam = (req.query.billingCycle || req.query.cycle || req.body?.billingCycle || req.body?.cycle) as string | undefined;
  const bodyWithCycle = {
    ...req.body,
    ...(cycleParam ? { billingCycle: cycleParam } : {}),
  };

  const input = changePlanSchema.parse(bodyWithCycle);
  const subscriptionDto = await service.downgradePlan(subId, input);

  return res.ok(subscriptionDto);
});

// ─── Expire Trial ─────────────────────────────────────────────────────────────

export const expireTrial = requestHandler<
  AuthRequest<{ subscriptionId?: string }>
>(async (req, res) => {
  let subId = req.params.subscriptionId;
  if (!subId) {
    const tenant = getCallerTenantOwner(req);
    const subDto = await service.findSubscriptionByOwner(tenant.ownerId, tenant.ownerType);
    subId = subDto.id;
  }

  await service.assertSubscriptionOwnership(subId, req.user);

  const subscriptionDto = await service.expireTrial(subId);
  return res.ok(subscriptionDto);
});
