import { BillingRepository } from "./billing.repository.js";
import { billingMapper } from "./dto/billing.mapper.js";
import type { SubscriptionOwnerType } from "./billing.types.js";
import type { SubscriptionResponse } from "./dto/billing.dto.js";

export class BillingReader {
  private readonly repository: BillingRepository;

  constructor(repository?: BillingRepository) {
    this.repository = repository || new BillingRepository();
  }

  async findSubscriptionByOwner(
    ownerId: string,
    ownerType: SubscriptionOwnerType,
  ): Promise<SubscriptionResponse | null> {
    const doc = await this.repository.findByOwner(ownerId, ownerType);
    if (!doc) return null;
    return billingMapper.toSubscriptionResponse(doc);
  }

  async findSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionResponse | null> {
    const doc = await this.repository.findById(subscriptionId);
    if (!doc) return null;
    return billingMapper.toSubscriptionResponse(doc);
  }
}

export type { SubscriptionResponse } from "./dto/billing.dto.js";
