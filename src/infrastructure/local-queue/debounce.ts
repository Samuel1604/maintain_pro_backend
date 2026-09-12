/**
 * Tier 2 utility: debounce.
 *
 * Returns a wrapped function that only actually runs `delayMs` after the
 * last call — each call within the window resets the timer. Purely
 * in-process/in-memory (a single `setTimeout` handle); nothing here
 * persists across a restart.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delayMs: number,
): (...args: TArgs) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: TArgs) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, delayMs);
  };
}

/**
 * Tier 2 utility: throttle.
 *
 * Returns a wrapped function that runs at most once per `intervalMs` — the
 * first call in a window runs immediately; calls during the cooldown are
 * dropped (trailing calls are not queued).
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  intervalMs: number,
): (...args: TArgs) => void {
  let lastRun = 0;

  return (...args: TArgs) => {
    const now = Date.now();
    if (now - lastRun >= intervalMs) {
      lastRun = now;
      fn(...args);
    }
  };
}
