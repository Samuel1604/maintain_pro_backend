export class QueueMetrics {
  private readonly counters = new Map<string, { completed: number; failed: number; latencyMs: number; retries: number }>();
  recordSuccess(queueName: string, _jobName: string, durationMs: number): void {
    const value = this.counters.get(queueName) ?? { completed: 0, failed: 0, latencyMs: 0, retries: 0 };
    value.completed += 1; value.latencyMs += durationMs; this.counters.set(queueName, value);
  }

  recordFailure(queueName: string, _jobName: string, durationMs: number): void {
    const value = this.counters.get(queueName) ?? { completed: 0, failed: 0, latencyMs: 0, retries: 0 };
    value.failed += 1; value.latencyMs += durationMs; this.counters.set(queueName, value);
  }

  recordRetry(queueName: string): void { const value = this.counters.get(queueName) ?? { completed: 0, failed: 0, latencyMs: 0, retries: 0 }; value.retries += 1; this.counters.set(queueName, value); }
  snapshot(queueName?: string) { return queueName ? this.counters.get(queueName) ?? { completed: 0, failed: 0, latencyMs: 0, retries: 0 } : Object.fromEntries(this.counters); }
}
