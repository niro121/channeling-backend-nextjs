/**
 * Fixed-window in-memory rate limiter for Public Careers API.
 * Per Node process (fine for single-instance / staging). For multi-instance
 * production, replace with Redis or an edge limiter later.
 */

type WindowEntry = {
  count: number;
  windowStartMs: number;
};

const store = new Map<string, WindowEntry>();

const DEFAULT_WINDOW_SEC = 60;
const DEFAULT_TOKEN_LIMIT = 30;
const DEFAULT_APPLY_LIMIT = 20;

export type PublicCareersRateBucket = 'token' | 'apply';

export type RateLimitOk = {
  ok: true;
  limit: number;
  remaining: number;
  resetAtSec: number;
};

export type RateLimitBlocked = {
  ok: false;
  limit: number;
  remaining: 0;
  resetAtSec: number;
  retryAfterSec: number;
};

export type RateLimitResult = RateLimitOk | RateLimitBlocked;

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || !raw.trim()) return fallback;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function getWindowSec(): number {
  return readPositiveInt(
    process.env.PUBLIC_CAREERS_RATE_LIMIT_WINDOW_SEC,
    DEFAULT_WINDOW_SEC
  );
}

function getLimit(bucket: PublicCareersRateBucket): number {
  if (bucket === 'token') {
    return readPositiveInt(
      process.env.PUBLIC_CAREERS_TOKEN_RATE_LIMIT,
      DEFAULT_TOKEN_LIMIT
    );
  }
  return readPositiveInt(
    process.env.PUBLIC_CAREERS_APPLY_RATE_LIMIT,
    DEFAULT_APPLY_LIMIT
  );
}

/** Best-effort client IP for rate keys (respects common proxy headers). */
export function getRequestIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

function pruneStale(now: number, windowMs: number) {
  if (store.size < 500) return;
  for (const [key, entry] of store) {
    if (now - entry.windowStartMs >= windowMs * 2) {
      store.delete(key);
    }
  }
}

/**
 * Consume one request against the bucket+key window.
 * Limit `0` disables limiting for that bucket.
 */
export function consumePublicCareersRateLimit(
  bucket: PublicCareersRateBucket,
  identityKey: string
): RateLimitResult {
  const limit = getLimit(bucket);
  const windowSec = Math.max(1, getWindowSec());
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const resetAtSec = Math.floor((now + windowMs) / 1000);

  if (limit === 0) {
    return { ok: true, limit: 0, remaining: 0, resetAtSec };
  }

  const key = `${bucket}:${identityKey.trim() || 'unknown'}`;
  pruneStale(now, windowMs);

  const existing = store.get(key);
  if (!existing || now - existing.windowStartMs >= windowMs) {
    store.set(key, { count: 1, windowStartMs: now });
    return {
      ok: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAtSec: Math.floor((now + windowMs) / 1000)
    };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.windowStartMs + windowMs - now) / 1000)
    );
    return {
      ok: false,
      limit,
      remaining: 0,
      resetAtSec: Math.floor((existing.windowStartMs + windowMs) / 1000),
      retryAfterSec
    };
  }

  existing.count += 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAtSec: Math.floor((existing.windowStartMs + windowMs) / 1000)
  };
}

export function applyRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult
): void {
  if (result.limit === 0) return;
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(result.resetAtSec));
  if (!result.ok) {
    headers.set('Retry-After', String(result.retryAfterSec));
  }
}

/** Test helper — clears in-memory windows. */
export function resetPublicCareersRateLimitStore(): void {
  store.clear();
}
