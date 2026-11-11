/** Keep speculative CPU preparation interruptible without a new worker/runtime. */
export function finish<T>(steps: Generator<void, T>): T {
    let step = steps.next();
    while (!step.done)
        step = steps.next();
    return step.value;
}
export async function runBatched<T>(steps: Generator<void, T>, signal?: AbortSignal): Promise<T> {
    let start = performance.now();
    signal?.throwIfAborted();
    for (;;) {
        const step = steps.next();
        if (step.done)
            return step.value;
        signal?.throwIfAborted();
        if (performance.now() - start >= 6) {
            await new Promise<void>(resolve => setTimeout(resolve, 0));
            signal?.throwIfAborted();
            start = performance.now();
        }
    }
}
