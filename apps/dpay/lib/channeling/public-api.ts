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
