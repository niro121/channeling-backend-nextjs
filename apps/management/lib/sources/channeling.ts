import 'server-only';
import { unstable_cache } from 'next/cache';

/**
 * Channeling Public API client (OAuth2 client credentials), server-side only.
 * Mirrors apps/dpay/lib/channeling/public-api.ts.
 */

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type CachedToken = { accessToken: string; expiresAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __managementChannelingTokenCache: CachedToken | undefined;
}

function getConfig() {
  const baseUrl = process.env.CHANNELING_API_URL?.replace(/\/$/, '');
  const clientId = process.env.CHANNELING_API_CLIENT_ID;
  const clientSecret = process.env.CHANNELING_API_CLIENT_SECRET;
  if (!baseUrl || !clientId || !clientSecret) return null;
  return { baseUrl, clientId, clientSecret };
}

export function isChannelingApiConfigured(): boolean {
  return getConfig() != null;
}

async function fetchAccessToken(): Promise<string> {
  const config = getConfig();
  if (!config) throw new Error('Channeling API is not configured.');

  const res = await fetch(`${config.baseUrl}/api/public/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret
    }),
    cache: 'no-store'
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to obtain channeling API token');
  }

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  // Refresh 60s before expiry
  globalThis.__managementChannelingTokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(30, expiresIn - 60) * 1000
  };
  return data.access_token;
}

async function getAccessToken(): Promise<string> {
  const cached = globalThis.__managementChannelingTokenCache;
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;
  return fetchAccessToken();
}

async function channelingGet<T>(path: string): Promise<T> {
  const config = getConfig();
  if (!config) throw new Error('Channeling API is not configured.');
  const url = `${config.baseUrl}${path}`;

  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${await getAccessToken()}` },
    cache: 'no-store'
  });
  // One retry on auth failure with a fresh token
  if (res.status === 401) {
    globalThis.__managementChannelingTokenCache = undefined;
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${await fetchAccessToken()}` },
      cache: 'no-store'
    });
  }

  const data = (await res.json()) as T & { error?: string; error_description?: string };
  if (!res.ok) {
    throw new Error(data.error_description || data.error || `Channeling API request failed: ${path}`);
  }
  return data;
}

export type ChannelingOverview = {
  activeDoctors: number;
  publishedBranches: number;
};

/** Cached for 5 minutes so the dashboard doesn't hit channeling on every load. */
export const getChannelingOverview = unstable_cache(
  async (): Promise<ChannelingOverview> => {
    const [doctors, locations] = await Promise.all([
      channelingGet<{ doctors?: unknown[] }>('/api/public/doctors'),
      channelingGet<{ totalRecords?: number }>('/api/public/locations?publishedOnly=true&limit=1')
    ]);
    return {
      activeDoctors: Array.isArray(doctors.doctors) ? doctors.doctors.length : 0,
      publishedBranches: locations.totalRecords ?? 0
    };
  },
  ['management-channeling-overview'],
  { revalidate: 300 }
);
