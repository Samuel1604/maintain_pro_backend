import { OrganizationService } from "@/modules/organizations/organization.service.js";
import { OrganizationRepository } from "@/modules/organizations/organization.repository.js";
import { VendorService } from "@/modules/vendors/vendor.service.js";
import { VendorRepository } from "@/modules/vendors/vendor.repository.js";
import {
  NotFoundException,
  ConflictException,
  ValidationException,
} from "@/shared/errors/index.js";
import { toObjectId } from "@/shared/validators/index.js";
import type { EventPublisher } from "@/infrastructure/events/publisher/event-publisher.interface.js";
import { BILLING_CONFIG } from "./billing.config.js";
import { SubscriptionPolicy as BillingPolicy } from "./billing.policy.js";
import { BillingRepository } from "./billing.repository.js";
import { PaymentRepository } from "./payments/payment.repository.js";
import { createPaymentProvider } from "./payment-provider.factory.js";
import { billingMapper } from "./dto/billing.mapper.js";
import {
  SubscriptionCreatedEvent,
  SubscriptionActivatedEvent,
  SubscriptionUpgradedEvent,
  SubscriptionDowngradedEvent,
  SubscriptionCancelledEvent,
  SubscriptionExpiredEvent,
} from "./events/events.js";
import type { SubscriptionResponse } from "./dto/billing.dto.js";
import type { PaymentProvider } from "./enums/payment-provider.enum.js";
import type { Actor } from "@/shared/types/request.js";
import type {
  CreateSubscriptionInput,
  ChangePlanInput,
} from "./billing.schema.js";
import type { ISubscription, SubscriptionOwnerType } from "./billing.types.js";

export class BillingService {
  private readonly repository: BillingRepository;
  private readonly paymentRepository: PaymentRepository;
  private readonly organizationService: OrganizationService;
  private readonly vendorService: VendorService;
  private readonly eventPublisher: EventPublisher;

  constructor(
    repository?: BillingRepository,
    paymentRepository?: PaymentRepository,
    organizationService?: OrganizationService,
    vendorService?: VendorService,
    eventPublisher?: EventPublisher,
  ) {
    this.repository = repository || new BillingRepository();
    this.paymentRepository = paymentRepository || new PaymentRepository();
    this.organizationService =
      organizationService ||
      new OrganizationService(new OrganizationRepository());
    this.vendorService =
      vendorService || new VendorService(new VendorRepository());
    // Avoid importing container/index at module load to prevent circular
    // dependency issues during test startup. AppContainer passes a real
    // EventPublisher instance when constructing BillingService; fall back
    // to a no-op publisher if none provided (safe for unit tests that don't
    // rely on event delivery).
    this.eventPublisher =
      eventPublisher ||
      ({
        publish: async () => {},
      } as EventPublisher);
  }

  // ─── Create Subscription ───────────────────────────────────────────────────

  /**
   * Creates a new subscription for an organisation or vendor.
   * Enforces domain policy checks and returns serialized SubscriptionResponse DTO.
   */
  async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<SubscriptionResponse> {
    // 1. Validate owner type
    BillingPolicy.validateOwnerType(input.ownerType!);

    // 2. Validate owner exists
    await this.assertOwnerExists(input.ownerId!, input.ownerType!);

    // 3. No existing subscription for this owner
    const existing = await this.repository.findByOwner(
      input.ownerId!,
      input.ownerType!,
    );

    if (existing) {
      throw new ConflictException(
        `This ${input.ownerType} already has a subscription.`,
      );
    }

    // 4. Determine trial duration based on selected plan
    const now = input.startsAt || new Date();
    let trialEndsAt: Date | undefined = input.trialEndsAt;

    if (!trialEndsAt) {
      const planDaysMap =
        BILLING_CONFIG.PLAN_TRIAL_PERIOD_DAYS[
          input.ownerType ?? "organization"
        ] ?? {};
      const trialDays =
        planDaysMap[input.plan] ?? BILLING_CONFIG.TRIAL_PERIOD_DAYS;

      if (trialDays > 0) {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
      }
    }

    const subscription = await this.repository.create({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      plan: input.plan,
      billingCycle: input.billingCycle || "monthly",
      status: "trial",
      provider: input.provider || BILLING_CONFIG.DEFAULT_PROVIDER,
      startsAt: now,
      trialEndsAt,
    });

    // Publish SubscriptionCreatedEvent
    await this.eventPublisher.publish(
      new SubscriptionCreatedEvent({
        subscriptionId: subscription._id.toString(),
        ownerId: subscription.ownerId.toString(),
        ownerType: subscription.ownerType,
        plan: subscription.plan,
        billingCycle: subscription.billingCycle,
      }),
    );

    return billingMapper.toSubscriptionResponse(subscription);
  }

  // ─── Find Subscription ─────────────────────────────────────────────────────

  /**
   * Retrieves a subscription DTO by ID.
   */
  async findSubscription(
    subscriptionId: string,
    actor: Actor,
  ): Promise<SubscriptionResponse> {
    const subscription = await this.findSubscriptionDocumentForActor(subscriptionId, actor);
    return billingMapper.toSubscriptionResponse(subscription);
  }

  /**
   * Retrieves a subscription DTO by owner (organization or vendor).
   */
  async findSubscriptionByOwner(
    ownerId: string,
    ownerType: SubscriptionOwnerType,
  ): Promise<SubscriptionResponse> {
    const subscription = await this.findSubscriptionDocumentByOwner(
      ownerId,
      ownerType,
    );
    return billingMapper.toSubscriptionResponse(subscription);
  }

  /** A missing subscription is a valid onboarding state for read-only callers. */
  async findSubscriptionByOwnerOptional(
    ownerId: string,
    ownerType: SubscriptionOwnerType,
  ): Promise<SubscriptionResponse | null> {
    const subscription = await this.repository.findByOwner(ownerId, ownerType);
    return subscription ? billingMapper.toSubscriptionResponse(subscription) : null;
  }

  /**
   * Updates the subscription billing cycle (monthly or annual).
   */
  async updateSubscriptionCycle(
    subscriptionId: string,
    billingCycle: "monthly" | "annual",
  ): Promise<SubscriptionResponse> {
    const subscription = await this.findSubscriptionDocument(subscriptionId);
    const updated = await this.repository.update(subscription._id.toString(), {
      billingCycle,
    });
    return billingMapper.toSubscriptionResponse(updated!);
  }

  // ─── Initiate Checkout ─────────────────────────────────────────────────────

  /**
   * Initiates payment checkout with selected payment gateway.
   * Enforces idempotency if an in-flight pending payment exists.
   */
  async initiateCheckout(
    subscriptionId: string,
    providerName?: PaymentProvider,
  ) {
    const subscription = await this.findSubscriptionDocument(subscriptionId);

    // Re-use in-flight pending payment for idempotency
    const existingPending =
      await this.paymentRepository.findPendingBySubscription(subscriptionId);
    if (existingPending) {
      return {
        paymentId: existingPending._id.toString(),
        providerCheckoutId: existingPending.providerCheckoutId,
        redirectUrl: existingPending.redirectUrl,
        status: existingPending.status,
      };
    }

    const provider =
      providerName || (subscription.provider as PaymentProvider) || "mock";
    const idempotencyKey = `checkout_${subscriptionId}_${Date.now()}`;

    // Calculate checkout amount in cents based on plan, ownerType, and billingCycle (with 20% annual discount)
    const ownerType = subscription.ownerType || "organization";
    const plan = subscription.plan;
    const cycle = subscription.billingCycle || "monthly";

    const baseMonthly =
      BILLING_CONFIG.PLAN_PRICES_USD_MONTHLY[ownerType]?.[plan] ?? 0;
    const monthlyRate =
      cycle === "annual"
        ? baseMonthly * (1 - BILLING_CONFIG.ANNUAL_DISCOUNT_PERCENT / 100)
        : baseMonthly;
    const totalDollars = cycle === "annual" ? monthlyRate * 12 : monthlyRate;
    const amountCents = Math.round(totalDollars * 100);

    const payment = await this.paymentRepository.create({
      subscriptionId: toObjectId(subscription._id.toString()),
      ownerType: subscription.ownerType,
      ownerId: subscription.ownerId,
      plan: subscription.plan,
      subscriptionStatusAtCheckout: subscription.status,
      provider,
      status: "pending",
      idempotencyKey,
    });

    const gateway = createPaymentProvider(provider);
    const checkoutResult = await gateway.initiateCheckout({
      paymentId: payment._id.toString(),
      idempotencyKey,
      plan: subscription.plan,
      amount: amountCents,
      currency: "usd",
    });

    await this.paymentRepository.update(payment._id.toString(), {
      providerCheckoutId: checkoutResult.providerCheckoutId,
      redirectUrl: checkoutResult.redirectUrl,
    });

    return {
      paymentId: payment._id.toString(),
      providerCheckoutId: checkoutResult.providerCheckoutId,
      redirectUrl: checkoutResult.redirectUrl,
      status: "pending",
    };
  }

  // ─── Handle Webhook ────────────────────────────────────────────────────────

  /**
   * Parses & verifies webhook signatures and transitions payment & subscription states atomically.
   */
  async handleWebhook(
    providerName: string,
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ) {
    const gateway = createPaymentProvider(providerName as PaymentProvider);
    let event;
    try {
      event = gateway.parseWebhookEvent(rawBody, signatureHeader);
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Invalid webhook signature.";
      throw new ValidationException(message);
    }

    const payment = await this.paymentRepository.findByProviderCheckoutId(
      event.providerCheckoutId,
    );
    if (!payment) {
      return { success: true };
    }

    // Atomic pending claim to guarantee idempotency across concurrent deliveries
    const claimed = await this.paymentRepository.claimPending(
      payment._id.toString(),
      {
        status: event.outcome === "succeeded" ? "succeeded" : "failed",
        providerReference: event.providerReference,
        failureReason: event.failureReason,
      },
    );

    if (!claimed) {
      // Already claimed/processed in a previous webhook delivery
      return { success: true };
    }

    if (event.outcome === "succeeded") {
      await this.activateSubscription(payment.subscriptionId.toString());
    } else {
      await this.repository.update(payment.subscriptionId.toString(), {
        status: "past_due",
      });
    }

    return { success: true };
  }

  // ─── Activate Subscription ─────────────────────────────────────────────────

  /**
   * Transitions a subscription from "trial" → "active".
   * Returns serialized SubscriptionResponse DTO.
   */
  async activateSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionResponse> {
    const subscription = await this.findSubscriptionDocument(subscriptionId);

    // Policy validates the transition
    BillingPolicy.canActivate(subscription);

    const updated = await this.repository.update(subscriptionId, {
      status: "active",
    });

    // Publish SubscriptionActivatedEvent
    await this.eventPublisher.publish(
      new SubscriptionActivatedEvent({
        subscriptionId: updated!._id.toString(),
        ownerId: updated!.ownerId.toString(),
        ownerType: updated!.ownerType,
        plan: updated!.plan,
        billingCycle: updated!.billingCycle,
        startsAt: (updated!.startsAt ?? new Date()).toISOString(),
      }),
    );

    return billingMapper.toSubscriptionResponse(updated!);
  }

  // ─── Cancel Subscription ───────────────────────────────────────────────────

  /**
   * Cancels an active or trial subscription.
   * Returns serialized SubscriptionResponse DTO.
   */
  async cancelSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionResponse> {
    const subscription = await this.findSubscriptionDocument(subscriptionId);

    BillingPolicy.canCancel(subscription);

    const updated = await this.repository.update(subscriptionId, {
      status: "cancelled",
      cancelledAt: new Date(),
    });

    // Publish SubscriptionCancelledEvent
    await this.eventPublisher.publish(
      new SubscriptionCancelledEvent({
        subscriptionId: updated!._id.toString(),
        ownerId: updated!.ownerId.toString(),
        ownerType: updated!.ownerType,
        plan: updated!.plan,
        cancelledAt: (updated!.cancelledAt ?? new Date()).toISOString(),
      }),
    );

    return billingMapper.toSubscriptionResponse(updated!);
  }

  // ─── Upgrade Plan ──────────────────────────────────────────────────────────

  /**
   * Upgrades the subscription to a higher-tier plan.
   * Returns serialized SubscriptionResponse DTO.
   */
  async upgradePlan(
    subscriptionId: string,
    input: ChangePlanInput,
  ): Promise<SubscriptionResponse> {
    const subscription = await this.findSubscriptionDocument(subscriptionId);

    BillingPolicy.canUpgrade(subscription.plan, input.plan);

    const updatePayload: Partial<ISubscription> = {
      plan: input.plan,
    };
    if (input.billingCycle) {
      updatePayload.billingCycle = input.billingCycle;
    }

    const updated = await this.repository.update(subscriptionId, updatePayload);

    // Publish SubscriptionUpgradedEvent
    await this.eventPublisher.publish(
      new SubscriptionUpgradedEvent({
        subscriptionId: updated!._id.toString(),
        ownerId: updated!.ownerId.toString(),
        ownerType: updated!.ownerType,
        fromPlan: subscription.plan,
        toPlan: updated!.plan,
        billingCycle: updated!.billingCycle,
      }),
    );

    return billingMapper.toSubscriptionResponse(updated!);
  }

  // ─── Downgrade Plan ────────────────────────────────────────────────────────

  /**
   * Downgrades the subscription to a lower-tier plan.
   * Returns serialized SubscriptionResponse DTO.
   */
  async downgradePlan(
    subscriptionId: string,
    input: ChangePlanInput,
  ): Promise<SubscriptionResponse> {
    const subscription = await this.findSubscriptionDocument(subscriptionId);

    BillingPolicy.canDowngrade(subscription.plan, input.plan);

    const updatePayload: Partial<ISubscription> = {
      plan: input.plan,
    };
    if (input.billingCycle) {
      updatePayload.billingCycle = input.billingCycle;
    }

    const updated = await this.repository.update(subscriptionId, updatePayload);

    // Publish SubscriptionDowngradedEvent
    await this.eventPublisher.publish(
      new SubscriptionDowngradedEvent({
        subscriptionId: updated!._id.toString(),
        ownerId: updated!.ownerId.toString(),
        ownerType: updated!.ownerType,
        fromPlan: subscription.plan,
        toPlan: updated!.plan,
        billingCycle: updated!.billingCycle,
      }),
    );

    return billingMapper.toSubscriptionResponse(updated!);
  }

  // ─── Expire Trial ──────────────────────────────────────────────────────────

  /**
   * Expires a trial subscription whose trial period has ended.
   * Returns serialized SubscriptionResponse DTO.
   */
  async expireTrial(subscriptionId: string): Promise<SubscriptionResponse> {
    const subscription = await this.findSubscriptionDocument(subscriptionId);

    BillingPolicy.canExpireTrial(subscription);

    const updated = await this.repository.update(subscriptionId, {
      status: "expired",
    });

    // Publish SubscriptionExpiredEvent
    await this.eventPublisher.publish(
      new SubscriptionExpiredEvent({
        subscriptionId: updated!._id.toString(),
        ownerId: updated!.ownerId.toString(),
        ownerType: updated!.ownerType,
        plan: updated!.plan,
        expiredAt: new Date().toISOString(),
      }),
    );

    return billingMapper.toSubscriptionResponse(updated!);
  }

  // ─── Is Subscription Active ────────────────────────────────────────────────

  /**
   * Returns true when subscription status is "active".
   */
  isSubscriptionActive(subscription: ISubscription): boolean {
    return subscription.status === "active";
  }

  // ─── Private Document Helpers ──────────────────────────────────────────────

  /**
   * Retrieves raw Mongoose document by ID for internal service policy execution & updates.
   */
  private async findSubscriptionDocument(
    subscriptionId: string,
  ): Promise<ISubscription> {
    const subscription = await this.repository.findById(subscriptionId);

    if (!subscription) {
      throw new NotFoundException("Subscription not found.");
    }

    return subscription;
  }

  /**
   * Retrieves raw Mongoose document by owner for internal service policy execution & updates.
   */
  private async findSubscriptionDocumentByOwner(
    ownerId: string,
    ownerType: SubscriptionOwnerType,
  ): Promise<ISubscription> {
    const subscription = await this.repository.findByOwner(ownerId, ownerType);

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for this ${ownerType} was not found.`,
      );
    }

    return subscription;
  }

  private async findSubscriptionDocumentForActor(
    subscriptionId: string,
    actor: Actor,
  ): Promise<ISubscription> {
    const ownerId = actor.organizationId ?? actor.vendorId;
    const ownerType: SubscriptionOwnerType | undefined = actor.organizationId
      ? "organization"
      : actor.vendorId
        ? "vendor"
        : undefined;

    if (!ownerId || !ownerType) {
      throw new NotFoundException("Subscription not found.");
    }

    const subscription = await this.repository.findByIdForOwner(
      subscriptionId,
      ownerId,
      ownerType,
    );
    if (!subscription) {
      throw new NotFoundException("Subscription not found.");
    }
    return subscription;
  }

  /**
   * Confirms the owner record exists in the database.
   * Queries Organization or Vendor service.
   * Throws NotFoundException if the record is missing.
   */
  private async assertOwnerExists(
    ownerId: string,
    ownerType: SubscriptionOwnerType,
  ): Promise<void> {
    let owner;

    if (ownerType === "organization") {
      owner = await this.organizationService.findById(ownerId);
    } else {
      owner = await this.vendorService.findById(ownerId);
    }

    if (!owner) {
      throw new NotFoundException(
        `${ownerType.charAt(0).toUpperCase() + ownerType.slice(1)} with id "${ownerId}" was not found.`,
      );
    }
  }
}
