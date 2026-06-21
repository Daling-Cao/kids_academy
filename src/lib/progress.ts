// Global request-activity store that drives the top loading bar.
// Any in-flight tracked request bumps the counter; the bar is visible
// whenever the counter is > 0. Kept framework-agnostic (plain pub-sub)
// so authFetch and raw fetch calls can report without importing React.

type Listener = () => void;

let inflight = 0;
const listeners = new Set<Listener>();

function emit() {
    listeners.forEach(l => l());
}

export function subscribeProgress(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getInflight(): number {
    return inflight;
}

export function startRequest(): void {
    inflight++;
    emit();
}

export function endRequest(): void {
    inflight = Math.max(0, inflight - 1);
    emit();
}

// Wrap a promise so it bumps the in-flight counter for its lifetime.
export function trackRequest<T>(p: Promise<T>): Promise<T> {
    startRequest();
    return p.finally(endRequest);
}
