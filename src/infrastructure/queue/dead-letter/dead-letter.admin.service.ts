import type { DeadLetterQueue, DeadLetterRecord } from "./dead-letter.queue.js";

/** Operational-only facade. Route/controller authorization belongs at the admin boundary. */
export class DeadLetterAdminService {
  constructor(private readonly deadLetterQueue: DeadLetterQueue) {}
  list(limit = 50): Promise<DeadLetterRecord[]> { return this.deadLetterQueue.list(limit); }
  inspect(dlqId: string): Promise<DeadLetterRecord | undefined> { return this.deadLetterQueue.inspect(dlqId); }
  replay(dlqId: string): Promise<string> { return this.deadLetterQueue.replay(dlqId); }
}
