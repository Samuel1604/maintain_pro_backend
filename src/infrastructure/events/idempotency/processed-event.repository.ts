import { ProcessedEvent } from "./processed-event.model.js";

export class ProcessedEventRepository {
  async claim(input: { eventId: string; consumerName?: string; jobId?: string; queue?: string; eventName: string; correlationId?: string; causationId?: string }, leaseMs = 120_000): Promise<boolean> {
    const consumerName = input.consumerName ?? "event-dispatcher";
    const claimInput = { ...input, consumerName };
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + leaseMs);
    try {
      const created = await ProcessedEvent.create({ ...claimInput, status: "processing", attempts: 1, startedAt: now, leaseUntil });
      return Boolean(created);
    } catch (error: unknown) {
      if ((error as { code?: number }).code !== 11000) throw error;
      const claimed = await ProcessedEvent.findOneAndUpdate(
        { eventId: input.eventId, consumerName, status: { $ne: "completed" }, $or: [{ status: "failed" }, { leaseUntil: { $lt: now } }] },
        { $set: { ...claimInput, status: "processing", startedAt: now, leaseUntil }, $inc: { attempts: 1 } },
        { new: true },
      ).lean();
      return Boolean(claimed);
    }
  }

  async complete(eventId: string, consumerName = "event-dispatcher"): Promise<void> { await ProcessedEvent.updateOne({ eventId, consumerName }, { $set: { status: "completed", completedAt: new Date(), leaseUntil: null } }); }
  async fail(eventId: string, error: unknown, consumerName = "event-dispatcher"): Promise<void> { await ProcessedEvent.updateOne({ eventId, consumerName }, { $set: { status: "failed", lastError: error instanceof Error ? error.message : String(error), leaseUntil: null } }); }
}
