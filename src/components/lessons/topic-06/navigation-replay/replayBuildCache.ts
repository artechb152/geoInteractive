/** Three fixed CPU worlds; one build per key, serial preparation, deterministic
 * ownership. Only the currently mounted world owns GPU instance buffers. */
export type WorldKey = 'depart' | 'approach' | 'after';
export const worldKey = (station: string): WorldKey => station === 'after' ? 'after' : station === 'depart' ? 'depart' : 'approach';
export function createBuildCache<T>(build: (key: WorldKey, signal: AbortSignal) => Promise<T>, disposeValue: (value: T) => void) {
    const jobs = new Map<WorldKey, Promise<T>>();
    const values = new Set<T>();
    const ready = new Set<WorldKey>();
    const abort = new AbortController();
    let queue: Promise<unknown> = Promise.resolve();
    return {
        get size() { return jobs.size; },
        get ready() { return [...ready]; },
        get(key: WorldKey): Promise<T> {
            if (!['depart', 'approach', 'after'].includes(key) || abort.signal.aborted)
                return Promise.reject(new Error('Inactive or unknown replay world'));
            const existing = jobs.get(key);
            if (existing)
                return existing;
            const p = queue.catch(() => { }).then(async () => {
                abort.signal.throwIfAborted();
                const value = await build(key, abort.signal);
                if (abort.signal.aborted) {
                    disposeValue(value);
                    abort.signal.throwIfAborted();
                }
                values.add(value);
                ready.add(key);
                return value;
            });
            jobs.set(key, p);
            queue = p;
            // Avoid unhandled rejections from speculative preparation; foreground
            // consumers still receive the original rejection and select fallback.
            void p.catch(() => { if (jobs.get(key) === p)
                jobs.delete(key); });
            return p;
        },
        dispose() { abort.abort(); values.forEach(disposeValue); values.clear(); jobs.clear(); ready.clear(); },
    };
}
