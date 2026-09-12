import { describe, it, expect, vi } from "vitest";
import { LocalTaskQueue } from "@/infrastructure/local-queue/local-task-queue.js";
import { debounce, throttle } from "@/infrastructure/local-queue/debounce.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("LocalTaskQueue", () => {
  it("runs tasks in order without exceeding the configured concurrency", async () => {
    const queue = new LocalTaskQueue({ concurrency: 2 });
    let active = 0;
    let maxActive = 0;
    const order: number[] = [];

    for (let i = 0; i < 5; i++) {
      queue.enqueue(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await sleep(20);
        order.push(i);
        active--;
      });
    }

    await queue.onIdle();

    expect(order).toHaveLength(5);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("reports task failures via onError instead of throwing out of enqueue", async () => {
    const queue = new LocalTaskQueue();
    const onError = vi.fn();

    queue.enqueue(() => {
      throw new Error("boom");
    }, onError);

    await queue.onIdle();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
  });

  it("does not persist anything — size/running reset once idle (volatile by design)", async () => {
    const queue = new LocalTaskQueue({ concurrency: 3 });
    for (let i = 0; i < 3; i++) {
      queue.enqueue(async () => {
        await sleep(10);
      });
    }
    await queue.onIdle();

    expect(queue.size).toBe(0);
    expect(queue.running).toBe(0);
  });
});

describe("debounce", () => {
  it("only runs once after the trailing edge, using the last call's args", async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 30);

    debounced("first");
    debounced("second");
    debounced("third");

    expect(fn).not.toHaveBeenCalled();

    await sleep(50);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("third");
  });
});

describe("throttle", () => {
  it("runs immediately on the first call and drops calls within the cooldown", async () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 50);

    throttled("a");
    throttled("b");
    throttled("c");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");

    await sleep(60);
    throttled("d");

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("d");
  });
});
