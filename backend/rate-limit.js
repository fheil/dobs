// In-memory guard against password guessing: after MAX_FAILURES failed
// attempts from one client IP within WINDOW_MS, that IP is blocked for the
// rest of the window. A success resets the counter. (Single backend
// process, so memory is enough; a restart clears it.)
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;

const failures = new Map(); // ip -> { count, since }

const current = ip => {
  const f = failures.get(ip);
  if (f && Date.now() - f.since > WINDOW_MS) {
    failures.delete(ip);
    return null;
  }
  return f;
};

export function isBlocked(ip) {
  return (current(ip)?.count ?? 0) >= MAX_FAILURES;
}

export function recordFailure(ip) {
  const f = current(ip);
  if (f) f.count += 1;
  else failures.set(ip, { count: 1, since: Date.now() });
}

export function recordSuccess(ip) {
  failures.delete(ip);
}

export const TOO_MANY = { error: 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.' };

// Drop expired entries now and then so the map can't grow without bound.
setInterval(() => {
  for (const ip of failures.keys()) current(ip);
}, WINDOW_MS).unref();
