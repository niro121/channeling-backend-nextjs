/**
 * Limits how much expensive work one server process runs at once.
 *
 * - Calls with the same key while one is already queued or running share that one result.
 * - At most `maxConcurrent` different keys run at a time; up to `maxQueued` more wait their turn.
 * - Beyond that, `run` returns null without starting the work, so the caller can report "busy".
 */
export function createKeyedWorkLimiter(options: { maxConcurrent: number; maxQueued: number }) {
  const inFlight = new Map<string, Promise<unknown>>();
  const waiting: Array<() => void> = [];
  let running = 0;

  function acquireSlot(): Promise<void> {
    if (running < options.maxConcurrent) {
      running += 1;
      return Promise.resolve();
    }
    // The slot passes directly to the next waiter on release, so `running` stays unchanged.
    return new Promise((resolve) => waiting.push(resolve));
  }

  function releaseSlot() {
    const next = waiting.shift();
    if (next) next();
    else running -= 1;
  }

  return {
    run<T>(key: string, work: () => Promise<T>): Promise<T> | null {
      const existing = inFlight.get(key);
      if (existing) return existing as Promise<T>;
      if (running >= options.maxConcurrent && waiting.length >= options.maxQueued) return null;

      const result = acquireSlot()
        .then(work)
        .finally(() => {
          inFlight.delete(key);
          releaseSlot();
        });
      inFlight.set(key, result);
      return result;
    },
  };
}
