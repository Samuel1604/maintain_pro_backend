import { DomainEvent } from "@/infrastructure/events/bus/domain-event.js";
import { BillingEvents } from "./billing.events.js";
import type {
  SubscriptionCreatedPayload,
  SubscriptionActivatedPayload,
  SubscriptionUpgradedPayload,
  SubscriptionDowngradedPayload,
  SubscriptionCancelledPayload,
  SubscriptionExpiredPayload,
} from "./billing.event-payloads.js";

export class SubscriptionCreatedEvent extends DomainEvent<SubscriptionCreatedPayload> {
  constructor(payload: SubscriptionCreatedPayload) {
    super(BillingEvents.SUBSCRIPTION_CREATED, payload);
  }
}

export class SubscriptionActivatedEvent extends DomainEvent<SubscriptionActivatedPayload> {
  constructor(payload: SubscriptionActivatedPayload) {
    super(BillingEvents.SUBSCRIPTION_ACTIVATED, payload);
  }
}

export class SubscriptionUpgradedEvent extends DomainEvent<SubscriptionUpgradedPayload> {
  constructor(payload: SubscriptionUpgradedPayload) {
    super(BillingEvents.SUBSCRIPTION_UPGRADED, payload);
  }
}

export class SubscriptionDowngradedEvent extends DomainEvent<SubscriptionDowngradedPayload> {
  constructor(payload: SubscriptionDowngradedPayload) {
    super(BillingEvents.SUBSCRIPTION_DOWNGRADED, payload);
  }
}

export class SubscriptionCancelledEvent extends DomainEvent<SubscriptionCancelledPayload> {
  constructor(payload: SubscriptionCancelledPayload) {
    super(BillingEvents.SUBSCRIPTION_CANCELLED, payload);
  }
}

export class SubscriptionExpiredEvent extends DomainEvent<SubscriptionExpiredPayload> {
  constructor(payload: SubscriptionExpiredPayload) {
    super(BillingEvents.SUBSCRIPTION_EXPIRED, payload);
  }
}
