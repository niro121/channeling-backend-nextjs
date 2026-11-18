import 'server-only';
import { SignJWT } from 'jose';
import { fetchServerSession } from '@/lib/session';

/**
 * Calls channeling's /api/management/* routes as the signed-in management user.
 * Channeling re-loads the user and runs its own services and permission checks,
 * so no approval logic lives in this app. Pairs with apps/channeling/lib/management-app-auth.ts.
 */
const ISSUER = 'archmage-management';
const AUDIENCE = 'channeling-management-api';
const TOKEN_TTL_SEC = 60;
// Give up well inside Heroku's 30s request limit, so a slow or restarting channeling shows the
// app's own "Try again" screen instead of Heroku's error page. Pages make at most two calls in a row.
const REQUEST_TIMEOUT_MS = 8_000;

export class ChannelingUserApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function getConfig() {
  const baseUrl = process.env.CHANNELING_API_URL?.replace(/\/$/, '');
  const secret = process.env.MANAGEMENT_APP_JWT_SECRET;
  if (!baseUrl || !secret) return null;
  return { baseUrl, secret: new TextEncoder().encode(secret) };
}

export function isChannelingUserApiConfigured(): boolean {
  return getConfig() != null;
}

async function signUserToken(userId: string, email: string | null | undefined, secret: Uint8Array) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(email ? { email } : {})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SEC)
    .sign(secret);
}

/** Raw fetch to channeling as the current user. Throws 401 when signed out or not configured. */
export async function channelingUserFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const config = getConfig();
  if (!config) throw new ChannelingUserApiError('Channeling is not connected.', 503);

  const session = await fetchServerSession();
  const userId = session?.user?.id;
  if (!userId) throw new ChannelingUserApiError('You must be signed in.', 401);

  const token = await signUserToken(userId, session.user?.email, config.secret);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(`${config.baseUrl}${path}`, { ...init, headers, signal, cache: 'no-store' });
}

/** JSON call; channeling's { success, errorCode, message } failures are returned, not thrown. */
export async function channelingUserJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await channelingUserFetch(path, init);
  const data = (await res.json().catch(() => null)) as T | null;
  if (data == null) throw new ChannelingUserApiError(`Channeling returned ${res.status}.`, res.status);
  return data;
}
