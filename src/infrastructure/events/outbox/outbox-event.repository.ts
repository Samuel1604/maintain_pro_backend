import { OutboxEvent, type OutboxEventDocument, type OutboxEventStatus } from "./outbox-event.model.js";
import type { ClientSession } from "mongoose";

export class OutboxEventRepository {
  async append(input: {
    eventId: string;
    eventType: string;
    aggregateId?: string;
    aggregateType?: string;
    payload: Record<string, unknown>;
    availableAt?: Date;
  }, session?: ClientSession): Promise<OutboxEventDocument> {
    const [event] = await OutboxEvent.create([input], session ? { session } : undefined);
    if (!event) throw new Error("Outbox event was not created");
    return event;
  }

  async claimNext(now = new Date(), leaseMs = 120_000): Promise<OutboxEventDocument | null> {
    const leaseUntil = new Date(now.getTime() + leaseMs);
    return OutboxEvent.findOneAndUpdate(
      {
        $or: [
          { status: "pending", availableAt: { $lte: now } },
          { status: "processing", leaseUntil: { $lt: now } },
        ],
      },
      { $set: { status: "processing", leaseUntil }, $inc: { attempts: 1 } },
      { sort: { availableAt: 1, createdAt: 1 }, new: true },
    );
  }

  async markPublished(eventId: string): Promise<void> {
    await OutboxEvent.updateOne({ eventId, status: "processing" }, { $set: { status: "published", processedAt: new Date(), leaseUntil: null } });
  }

  async markFailed(eventId: string, error: unknown, options: { retryAt?: Date; deadLetter?: boolean } = {}): Promise<void> {
    const status: OutboxEventStatus = options.deadLetter ? "dead_letter" : "pending";
    await OutboxEvent.updateOne(
      { eventId, status: "processing" },
      { $set: { status, availableAt: options.retryAt ?? new Date(), lastError: error instanceof Error ? error.message : String(error), leaseUntil: null } },
    );
  }

  findByEventId(eventId: string) {
    return OutboxEvent.findOne({ eventId });
  }
}
