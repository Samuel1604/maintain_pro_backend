import type { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import type { EventHandler } from "@/infrastructure/events/bus/event-handler.interface.js";
import { BillingEvents } from "@/modules/billing/events/billing.events.js";
import type {
  SubscriptionActivatedPayload,
  SubscriptionCreatedPayload,
  SubscriptionUpgradedPayload,
  SubscriptionDowngradedPayload,
  SubscriptionCancelledPayload,
  SubscriptionExpiredPayload,
} from "@/modules/billing/events/billing.event-payloads.js";
import type { OrganizationService } from "@/modules/organizations/organization.service.js";
import type { VendorService } from "@/modules/vendors/vendor.service.js";
import type { EmailService } from "@/modules/email/email.service.js";
import type { LoggerService } from "@/infrastructure/logging/logger.service.js";

export class BillingListener implements EventHandler<DomainEvent> {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly vendorService: VendorService,
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
  ) {}

  public async handle(event: DomainEvent): Promise<void> {
    try {
      switch (event.name) {
        case BillingEvents.SUBSCRIPTION_CREATED: {
          const payload = event.payload as SubscriptionCreatedPayload;
          await this.notifyOwner(payload.ownerType, payload.ownerId, `Subscription created`, `Your ${payload.ownerType} subscription (${payload.plan}) was created.`);
          break;
        }

        case BillingEvents.SUBSCRIPTION_ACTIVATED: {
          const payload = event.payload as SubscriptionActivatedPayload;
          await this.notifyOwner(payload.ownerType, payload.ownerId, `Subscription activated`, `Your subscription (${payload.plan}) is now active and starts at ${payload.startsAt}.`);
          break;
        }

        case BillingEvents.SUBSCRIPTION_UPGRADED: {
          const payload = event.payload as SubscriptionUpgradedPayload;
          await this.notifyOwner(payload.ownerType, payload.ownerId, `Subscription upgraded`, `Your subscription was upgraded from ${payload.fromPlan} to ${payload.toPlan}.`);
          break;
        }

        case BillingEvents.SUBSCRIPTION_DOWNGRADED: {
          const payload = event.payload as SubscriptionDowngradedPayload;
          await this.notifyOwner(payload.ownerType, payload.ownerId, `Subscription downgraded`, `Your subscription was downgraded from ${payload.fromPlan} to ${payload.toPlan}.`);
          break;
        }

        case BillingEvents.SUBSCRIPTION_CANCELLED: {
          const payload = event.payload as SubscriptionCancelledPayload;
          await this.notifyOwner(payload.ownerType, payload.ownerId, `Subscription cancelled`, `Your subscription (${payload.plan}) was cancelled at ${payload.cancelledAt}.`);
          break;
        }

        case BillingEvents.SUBSCRIPTION_EXPIRED: {
          const payload = event.payload as SubscriptionExpiredPayload;
          await this.notifyOwner(payload.ownerType, payload.ownerId, `Subscription expired`, `Your subscription (${payload.plan}) expired at ${payload.expiredAt}.`);
          break;
        }

        default:
          return;
      }
    } catch (err) {
      this.logger.error("BillingListener failed to handle event", { name: event.name, error: String(err) });
    }
  }

  private async notifyOwner(ownerType: string, ownerId: string, subject: string, message: string) {
    try {
      let contactEmail: string | undefined;
      if (ownerType === "organization") {
        const org = await this.organizationService.findById(ownerId);
        contactEmail = org?.email;
      } else if (ownerType === "vendor") {
        const vendor = await this.vendorService.findById(ownerId);
        contactEmail = vendor?.email;
      }

      if (!contactEmail) {
        this.logger.warn("No contact email found for billing owner", { ownerType, ownerId });
        return;
      }

      await this.emailService.send({
        to: contactEmail,
        subject,
        html: `<div><p>${message}</p></div>`,
      });
      this.logger.info("Billing notification sent", { ownerType, ownerId, subject });
    } catch (err) {
      this.logger.error("Failed to notify billing owner", { ownerType, ownerId, error: String(err) });
    }
  }
}
