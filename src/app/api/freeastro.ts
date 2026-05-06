const DEFAULT_MIN_INTERVAL_MS = 1_100;

let nextFreeAstroRequestAt = 0;
let freeAstroQueue: Promise<void> = Promise.resolve();

function configuredInterval() {
  const value = Number(process.env.FREEASTRO_MIN_INTERVAL_MS);
  if (!Number.isFinite(value) || value < 0) return DEFAULT_MIN_INTERVAL_MS;
  return value;
}

async function waitForFreeAstroSlot() {
  const previous = freeAstroQueue;
  let release!: () => void;
  freeAstroQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  const now = Date.now();
  const waitMs = Math.max(0, nextFreeAstroRequestAt - now);
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  nextFreeAstroRequestAt = Date.now() + configuredInterval();
  release();
}

export async function freeAstroFetch(input: URL | string, init: RequestInit, timeoutMs?: number) {
  await waitForFreeAstroSlot();
  return fetch(input, {
    ...init,
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : init.signal,
  });
}
