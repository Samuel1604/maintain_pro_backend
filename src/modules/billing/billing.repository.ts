import { Subscription } from "./billing.model.js";
import type { ISubscription } from "./billing.types.js";
import type { SubscriptionOwnerType } from "./billing.types.js";
import type { UpdateQuery } from "mongoose";
import type { ClientSession } from "mongoose";

export class BillingRepository {
  async create(data: Record<string, unknown>): Promise<ISubscription> {
    return Subscription.create(data);
  }

  async findById(id: string, session?: ClientSession): Promise<ISubscription | null> {
    return Subscription.findOne({ _id: id }, undefined, session ? { session } : undefined);
  }

  async findByIdForOwner(
    id: string,
    ownerId: string,
    ownerType: SubscriptionOwnerType,
  ): Promise<ISubscription | null> {
    return Subscription.findOne({ _id: id, ownerId, ownerType });
  }

  async findByOwner(
    ownerId: string,
    ownerType: SubscriptionOwnerType,
  ): Promise<ISubscription | null> {
    return Subscription.findOne({ ownerId, ownerType });
  }

  async update(
    id: string,
    updates: UpdateQuery<ISubscription>,
    session?: ClientSession,
  ): Promise<ISubscription | null> {
    return Subscription.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      ...(session ? { session } : {}),
    });
  }

  async delete(id: string): Promise<void> {
    await Subscription.findByIdAndDelete(id);
  }
}
