import 'server-only';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type SearchParamsInput = Record<
  string,
  string | number | boolean | null | undefined
>;

export type ChannelingApiSuccess<T> = {
  success: true;
  status: number;
  data: T;
};

export type ChannelingApiFailure = {
  success: false;
  status: number;
  error: string;
  errorDescription?: string;
};

export type ChannelingApiResult<T> =
  | ChannelingApiSuccess<T>
  | ChannelingApiFailure;

export type ChannelingRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: SearchParamsInput;
  /** Bearer token. When omitted and `auth` is true, a token is fetched automatically. */
  token?: string;
  /** Fetch and attach a Bearer token using CHANNELING_API_CLIENT_ID / CHANNELING_API_CLIENT_SECRET. */
  auth?: boolean;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
};

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

const DEFAULT_BASE_URL = 'http://localhost:3000';

/** Base URL for the Channeling app (no trailing slash). */
export function getChannelingBaseUrl(): string {
  return (process.env.CHANNELING_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
}

/** Build a full Channeling API URL with optional query parameters. */
export function buildChannelingUrl(
  path: string,
  searchParams?: SearchParamsInput
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${getChannelingBaseUrl()}${normalizedPath}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function parseErrorBody(body: unknown): {
  error: string;
  errorDescription?: string;
} {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const error =
      (typeof record.error === 'string' && record.error) ||
      (typeof record.message === 'string' && record.message) ||
      'request_failed';
    const errorDescription =
      (typeof record.error_description === 'string' && record.error_description) ||
      (typeof record.errorDescription === 'string' && record.errorDescription) ||
      undefined;

    return { error, errorDescription };
  }

  return { error: 'request_failed' };
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
}

/** Request an OAuth2 access token from Channeling's public API. */
export async function getChannelingAccessToken(): Promise<string> {
  const clientId = process.env.CHANNELING_API_CLIENT_ID;
  const clientSecret = process.env.CHANNELING_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'CHANNELING_API_CLIENT_ID and CHANNELING_API_CLIENT_SECRET must be set for authenticated API calls'
    );
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.accessToken;
  }

  const response = await fetch(buildChannelingUrl('/api/public/token'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    }),
    cache: 'no-store'
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    const { error, errorDescription } = parseErrorBody(body);
    throw new Error(errorDescription || error);
  }

  const accessToken =
    body &&
    typeof body === 'object' &&
    typeof (body as Record<string, unknown>).access_token === 'string'
      ? ((body as Record<string, unknown>).access_token as string)
      : null;

  if (!accessToken) {
    throw new Error('Token response did not include access_token');
  }

  const expiresIn =
    body &&
    typeof body === 'object' &&
    typeof (body as Record<string, unknown>).expires_in === 'number'
      ? ((body as Record<string, unknown>).expires_in as number)
      : 3600;

  tokenCache = {
    accessToken,
    expiresAt: now + expiresIn * 1000
  };

  return accessToken;
}

/** Low-level fetch wrapper for Channeling API requests. */
export async function channelingFetch<T = unknown>(
  path: string,
  options: ChannelingRequestOptions = {}
): Promise<ChannelingApiResult<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    searchParams,
    token,
    auth = false,
    cache,
    next
  } = options;

  const requestHeaders = new Headers(headers);
  const hasJsonBody = body !== undefined && body !== null;

  if (hasJsonBody && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  } else if (auth) {
    const accessToken = await getChannelingAccessToken();
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(buildChannelingUrl(path, searchParams), {
      method,
      headers: requestHeaders,
      body: hasJsonBody ? JSON.stringify(body) : undefined,
      cache,
      next
    });

    const responseBody = await parseResponseBody(response);

    if (!response.ok) {
      const { error, errorDescription } = parseErrorBody(responseBody);
      return {
        success: false,
        status: response.status,
        error,
        errorDescription
      };
    }

    return {
      success: true,
      status: response.status,
      data: responseBody as T
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Network request failed';

    return {
      success: false,
      status: 0,
      error: 'network_error',
      errorDescription: message
    };
  }
}

/** Convenience helpers for common HTTP methods. */
export const channelingApi = {
  get<T = unknown>(
    path: string,
    options: Omit<ChannelingRequestOptions, 'method' | 'body'> = {}
  ) {
    return channelingFetch<T>(path, { ...options, method: 'GET' });
  },

  post<T = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ChannelingRequestOptions, 'method' | 'body'> = {}
  ) {
    return channelingFetch<T>(path, { ...options, method: 'POST', body });
  },

  put<T = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ChannelingRequestOptions, 'method' | 'body'> = {}
  ) {
    return channelingFetch<T>(path, { ...options, method: 'PUT', body });
  },

  patch<T = unknown>(
    path: string,
    body?: unknown,
    options: Omit<ChannelingRequestOptions, 'method' | 'body'> = {}
  ) {
    return channelingFetch<T>(path, { ...options, method: 'PATCH', body });
  },

  delete<T = unknown>(
    path: string,
    options: Omit<ChannelingRequestOptions, 'method' | 'body'> = {}
  ) {
    return channelingFetch<T>(path, { ...options, method: 'DELETE' });
  }
};
