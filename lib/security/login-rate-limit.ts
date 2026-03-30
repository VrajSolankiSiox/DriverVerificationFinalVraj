const attempts = new Map<string, { count: number; lockedUntil?: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

function scheduleExpiry(key: string) {
  const timer = setTimeout(() => attempts.delete(key), WINDOW_MS);
  if (typeof timer === "object" && timer && "unref" in timer && typeof timer.unref === "function") {
    timer.unref();
  }
}

export function checkLoginThrottle(key: string) {
  const entry = attempts.get(key);
  if (!entry) {
    return { allowed: true };
  }

  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - Date.now() };
  }

  return { allowed: true };
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || (entry.lockedUntil && entry.lockedUntil < now)) {
    attempts.set(key, { count: 1 });
    scheduleExpiry(key);
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
  }
  attempts.set(key, entry);
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
