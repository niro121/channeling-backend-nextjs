/**
 * Shared helpers for Sails migrate API scripts.
 */

export const MIGRATE_BASE_URL = process.env.MIGRATE_BASE_URL || 'http://localhost:1337';
export const MIGRATE_USER_KEY = process.env.MIGRATE_USER_KEY || '';
export const IMPORT_USER_EMAIL = 'developer@archmage.lk';

type MigrateResponse<T> = {
  status: boolean;
  version: number;
  error_code: number;
} & Record<string, T[]>;

export type MigrateFetchParams = {
  id?: string;
  doctor?: string;
  session?: string;
  from_date?: string;
  to_date?: string;
  /** Legacy doctor_sessions row id (Mongo). Works with include_unpublished. */
  template_id?: string;
  /** When true, Sails returns inactive/unpublished templates too. */
  include_unpublished?: boolean;
  /** all-bookings: filter by Session.date instead of Booking.createdAt */
  by_session_date?: boolean;
};

/** Run an async operation, retrying on Prisma P2034 (write conflict/deadlock). */
export async function retryOnConflict<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; delayMs?: number } = {}
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const delayMs = opts.delayMs ?? 80;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastError = e;
      const code = (e as { code?: string })?.code;
      if (code === 'P2034' && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

export async function migrateFetch<T>(
  endpoint: string,
  listKey: string,
  params?: MigrateFetchParams
): Promise<T[]> {
  if (!MIGRATE_USER_KEY) {
    throw new Error('Missing MIGRATE_USER_KEY');
  }
  let url = `${MIGRATE_BASE_URL.replace(/\/$/, '')}/api/v1/migrate/${endpoint}?user_key=${encodeURIComponent(MIGRATE_USER_KEY)}`;
  if (params?.id) url += `&id=${encodeURIComponent(params.id)}`;
  if (params?.doctor) url += `&doctor=${encodeURIComponent(params.doctor)}`;
  if (params?.session) url += `&session=${encodeURIComponent(params.session)}`;
  if (params?.from_date) url += `&from_date=${encodeURIComponent(params.from_date)}`;
  if (params?.to_date) url += `&to_date=${encodeURIComponent(params.to_date)}`;
  if (params?.template_id) url += `&template_id=${encodeURIComponent(params.template_id)}`;
  if (params?.include_unpublished) url += `&include_unpublished=1`;
  if (params?.by_session_date) url += `&by_session_date=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const data = (await res.json()) as MigrateResponse<T>;
  if (data.error_code !== 0) {
    if (data.error_code === 1) {
      throw new Error(`Invalid or missing user_key. URL: ${url}`);
    }
    if (data.error_code === 2) {
      throw new Error(
        `Legacy migrate API database error (error_code 2). Check Sails server logs. URL: ${url}`
      );
    }
    throw new Error(`API error_code ${data.error_code}: ${url}`);
  }
  const list = data[listKey];
  return Array.isArray(list) ? list : [];
}

export function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function toLegacyString(value: unknown): string | null {
  if (value == null) return null;
  const s = typeof value === 'string' ? value : String(value);
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function msToDateOrNull(ms: number | string | undefined | null): Date | null {
  const n = safeNumber(ms);
  if (!n) return null;
  return new Date(n);
}

/** Unix ms or seconds → Date. */
export function unixToDate(ms: unknown): Date | null {
  if (ms == null) return null;
  const n = typeof ms === 'number' ? ms : Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n >= 1e12 ? n : n * 1000);
}

export function unixToSeconds(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return n >= 1e12 ? Math.floor(n / 1000) : Math.floor(n);
}
