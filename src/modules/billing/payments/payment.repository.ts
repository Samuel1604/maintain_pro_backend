import { Payment } from "./payment.model.js";
import type { IPayment } from "./payment.types.js";
import type { UpdateQuery } from "mongoose";
import type { ClientSession } from "mongoose";

export class PaymentRepository {
  async create(data: Partial<IPayment>): Promise<IPayment> {
    return Payment.create(data);
  }

  async findById(id: string): Promise<IPayment | null> {
    return Payment.findById(id);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<IPayment | null> {
    return Payment.findOne({ idempotencyKey });
  }

  async findByProviderCheckoutId(providerCheckoutId: string): Promise<IPayment | null> {
    return Payment.findOne({ providerCheckoutId });
  }

  async findPendingBySubscription(subscriptionId: string): Promise<IPayment | null> {
    return Payment.findOne({ subscriptionId, status: "pending" });
  }

  /**
   * Atomically transitions a payment out of "pending" — filtered on
   * `status: "pending"` in the same query, not a separate read-then-write.
   * Two concurrent deliveries of the same provider webhook event can both
   * reach this call; only the first one's write matches the filter and
   * returns the updated document. The second gets `null`, meaning "this
   * was already claimed by another delivery — do nothing further."
   */
  async claimPending(
    id: string,
    updates: UpdateQuery<IPayment>,
    session?: ClientSession,
  ): Promise<IPayment | null> {
    return Payment.findOneAndUpdate({ _id: id, status: "pending" }, updates, {
      returnDocument: "after",
      ...(session ? { session } : {}),
    });
  }

  async update(
    id: string,
    updates: UpdateQuery<IPayment>,
  ): Promise<IPayment | null> {
    return Payment.findByIdAndUpdate(id, updates, { returnDocument: "after" });
  }
}
