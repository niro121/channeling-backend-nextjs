import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { isPublicApiScopeId, type PublicApiScopeId } from '@/lib/permissions';

const JWT_ISSUER = 'hrm-public-careers';
const JWT_AUDIENCE = 'hrm-public-careers';
const DEFAULT_EXPIRES_IN_SEC = 3600;

function getTokenTtlSec(): number {
  const raw = process.env.PUBLIC_CAREERS_TOKEN_TTL_SEC;
  if (!raw?.trim()) return DEFAULT_EXPIRES_IN_SEC;
  const n = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EXPIRES_IN_SEC;
}

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.PUBLIC_CAREERS_JWT_SECRET ??
    process.env.JWT_SECRET ??
    process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      'PUBLIC_CAREERS_JWT_SECRET, JWT_SECRET, or NEXTAUTH_SECRET must be set for careers token signing'
    );
  }
  return new TextEncoder().encode(secret);
}

export type PublicCareersClientContext = {
  /** OAuth client_id (JWT sub) */
  clientId: string;
  /** ApiClient document id */
  id: string;
  /** Auth User.id — API User acting identity */
  actingUserId: string;
  /** Scopes from DB (authoritative on each request) */
  scopes: PublicApiScopeId[];
};

/**
 * Issue a JWT for the given clientId (OAuth2 client credentials).
 * Scopes are embedded for convenience; verify path reloads them from DB.
 */
export async function issuePublicCareersToken(
  clientId: string,
  scopes: string[],
  expiresInSec: number = getTokenTtlSec()
): Promise<{ accessToken: string; expiresIn: number }> {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSec;
  const accessToken = await new SignJWT({ scopes })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(clientId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);
  return { accessToken, expiresIn: expiresInSec };
}

/**
 * Verify Bearer JWT and load ApiClient from DB (must exist, not blocked).
 * Returns null if missing, invalid, or blocked.
 */
export async function getPublicCareersClient(
  headers: Headers
): Promise<PublicCareersClientContext | null> {
  const auth = headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
    const clientId = payload.sub;
    if (!clientId || typeof clientId !== 'string') return null;

    const client = await prisma.apiClient.findUnique({
      where: { clientId },
      select: {
        id: true,
        isBlocked: true,
        actingUserId: true,
        scopes: true
      }
    });
    if (!client || client.isBlocked) return null;
    if (!client.actingUserId) return null;

    const scopes = (client.scopes ?? []).filter(isPublicApiScopeId);

    return {
      clientId,
      id: client.id,
      actingUserId: client.actingUserId,
      scopes
    };
  } catch {
    return null;
  }
}

export function clientHasScope(
  client: PublicCareersClientContext,
  scope: PublicApiScopeId
): boolean {
  return client.scopes.includes(scope);
}

export type RequireCareersScopeResult =
  | { ok: true; client: PublicCareersClientContext }
  | {
      ok: false;
      status: 401 | 403;
      error: 'invalid_token' | 'insufficient_scope';
      errorDescription: string;
    };

/** Verify Bearer + blocked check + required scope for public careers routes. */
export async function requirePublicCareersScope(
  headers: Headers,
  scope: PublicApiScopeId
): Promise<RequireCareersScopeResult> {
  const client = await getPublicCareersClient(headers);
  if (!client) {
    return {
      ok: false,
      status: 401,
      error: 'invalid_token',
      errorDescription: 'Missing or invalid Bearer token'
    };
  }
  if (!clientHasScope(client, scope)) {
    return {
      ok: false,
      status: 403,
      error: 'insufficient_scope',
      errorDescription: `Required scope: ${scope}`
    };
  }
  return { ok: true, client };
}
