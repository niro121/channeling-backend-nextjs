import type { PublicDoctor } from '@/types/channeling-doctor';

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type DoctorsResponse = {
  doctors?: PublicDoctor[];
  error?: string;
  error_description?: string;
};

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __dpayChannelingTokenCache: CachedToken | undefined;
}

function getConfig() {
  const baseUrl = process.env.CHANNELING_API_URL?.replace(/\/$/, '');
  const clientId = process.env.CHANNELING_API_CLIENT_ID;
  const clientSecret = process.env.CHANNELING_API_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    return null;
  }

  return { baseUrl, clientId, clientSecret };
}

async function fetchAccessToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/public/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: 'no-store',
  });

  const data = (await res.json()) as TokenResponse;

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'Failed to obtain channeling API token'
    );
  }

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  // Refresh 60s before expiry
  globalThis.__dpayChannelingTokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(30, expiresIn - 60) * 1000,
  };

  return data.access_token;
}

async function getAccessToken(): Promise<string> {
  const config = getConfig();
  if (!config) {
    throw new Error(
      'Channeling API is not configured. Set CHANNELING_API_URL, CHANNELING_API_CLIENT_ID, and CHANNELING_API_CLIENT_SECRET.'
    );
  }

  const cached = globalThis.__dpayChannelingTokenCache;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.accessToken;
  }

  return fetchAccessToken(config.baseUrl, config.clientId, config.clientSecret);
}

/**
 * Fetches published doctors from channeling Public API (server-side only).
 */
export async function fetchChannelingDoctors(keyword?: string): Promise<PublicDoctor[]> {
  const config = getConfig();
  if (!config) {
    throw new Error(
      'Channeling API is not configured. Set CHANNELING_API_URL, CHANNELING_API_CLIENT_ID, and CHANNELING_API_CLIENT_SECRET.'
    );
  }

  const token = await getAccessToken();
  const url = new URL(`${config.baseUrl}/api/public/doctors`);
  const trimmed = keyword?.trim();
  if (trimmed) url.searchParams.set('keyword', trimmed);

  let res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  // One retry on auth failure with a fresh token
  if (res.status === 401) {
    globalThis.__dpayChannelingTokenCache = undefined;
    const freshToken = await fetchAccessToken(
      config.baseUrl,
      config.clientId,
      config.clientSecret
    );
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${freshToken}` },
      cache: 'no-store',
    });
  }

  const data = (await res.json()) as DoctorsResponse;

  if (!res.ok) {
    throw new Error(
      data.error_description || data.error || 'Failed to fetch doctors from channeling'
    );
  }

  return Array.isArray(data.doctors) ? data.doctors : [];
}

export function isChannelingApiConfigured(): boolean {
  return getConfig() != null;
}

export type ChannelingCashierShift = {
  id: string;
  userId: string;
  status: number;
  statusLabel: 'active' | 'paused' | 'handover_pending';
  locationId: string | null;
  locationName: string | null;
  locationCode: string | null;
  startedAt: string;
  endsAt: string;
  expired: boolean;
  canPause: boolean;
  canResume: boolean;
  floatBalanceCents: number;
  floatRequest: {
    status: 'pending' | 'approved';
    floatNo: string | null;
    amountCents: number;
  } | null;
};

type ShiftResponse = {
  shift?: ChannelingCashierShift | null;
  error?: string;
  error_description?: string;
};

async function channelingFetch(path: string, init?: RequestInit): Promise<Response> {
  const config = getConfig();
  if (!config) {
    throw new Error(
      'Channeling API is not configured. Set CHANNELING_API_URL, CHANNELING_API_CLIENT_ID, and CHANNELING_API_CLIENT_SECRET.'
    );
  }
  const token = await getAccessToken();
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  let res = await fetch(`${config.baseUrl}${path}`, { ...init, headers, cache: 'no-store' });
  if (res.status === 401) {
    globalThis.__dpayChannelingTokenCache = undefined;
    const fresh = await fetchAccessToken(config.baseUrl, config.clientId, config.clientSecret);
    headers.set('Authorization', `Bearer ${fresh}`);
    res = await fetch(`${config.baseUrl}${path}`, { ...init, headers, cache: 'no-store' });
  }
  return res;
}

export async function fetchChannelingShift(userId: string): Promise<ChannelingCashierShift | null> {
  const res = await channelingFetch(`/api/public/shifts/current?userId=${encodeURIComponent(userId)}`);
  const data = (await res.json()) as ShiftResponse;
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Failed to load the Channeling shift');
  }
  return data.shift ?? null;
}

export async function pauseChannelingShift(userId: string): Promise<ChannelingCashierShift | null> {
  return postShift('/api/public/shifts/pause', userId);
}

export async function resumeChannelingShift(userId: string): Promise<ChannelingCashierShift | null> {
  return postShift('/api/public/shifts/resume', userId);
}

async function postShift(path: string, userId: string): Promise<ChannelingCashierShift | null> {
  const res = await channelingFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = (await res.json()) as ShiftResponse;
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Shift update failed');
  }
  return data.shift ?? null;
}

export type DpayJournalShare = {
  doctorId: string;
  doctorCode: string;
  doctorName: string;
  amount: number;
};

function isTransientChannelingError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  const message = error.message.toLowerCase();
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('aborted') ||
    message.includes('econn') ||
    message.includes('not responding')
  );
}

async function postChannelingDpayJournalOnce(input: {
  userId: string;
  shiftId: string;
  kind: 'patient_payment' | 'patient_refund' | 'doctor_payment' | 'doctor_payment_cancel';
  referenceId?: string | null;
  description: string;
  paymentMethod: number;
  shares: DpayJournalShare[];
  whtAmount?: number;
}): Promise<void> {
  const res = await channelingFetch('/api/public/shifts/journals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { error_description?: string; error?: string };
  if (res.status >= 500) {
    throw new Error('Channeling is not responding. Try again.');
  }
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Could not post the till journal');
  }
}

export async function postChannelingDpayJournal(input: {
  userId: string;
  shiftId: string;
  kind: 'patient_payment' | 'patient_refund' | 'doctor_payment' | 'doctor_payment_cancel';
  referenceId?: string | null;
  description: string;
  paymentMethod: number;
  shares: DpayJournalShare[];
  whtAmount?: number;
}): Promise<void> {
  try {
    await postChannelingDpayJournalOnce(input);
  } catch (error: unknown) {
    if (!isTransientChannelingError(error)) throw error;
    await postChannelingDpayJournalOnce(input);
  }
}
