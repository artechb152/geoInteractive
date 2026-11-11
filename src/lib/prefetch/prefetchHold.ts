/**
 * Lets the page hold the background prefetcher off while it loads something
 * the learner is waiting for (every ModelLoading takes a hold while mounted).
 * A hold expires after HOLD_MAX_MS, so a loader that never unmounts cannot
 * stop the prefetcher for good.
 */

const HOLD_MAX_MS = 20_000;

const holds = new Map<number, number>();
let nextId = 0;

/** Takes a hold; call the returned function to release it. */
export function holdPrefetch(): () => void {
  const id = nextId++;
  holds.set(id, Date.now());
  return () => {
    holds.delete(id);
  };
}

export function prefetchHeld(now = Date.now()): boolean {
  for (const [id, at] of holds) {
    if (now - at < HOLD_MAX_MS) return true;
    holds.delete(id);
  }
  return false;
}
