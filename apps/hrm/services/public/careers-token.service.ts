import * as argon2 from 'argon2';
import prisma from '@/lib/prisma';
import { issuePublicCareersToken } from '@/lib/public-careers-auth';
import { DEFAULT_PUBLIC_API_SCOPES, isPublicApiScopeId } from '@/lib/permissions';

export type RequestCareersTokenParams = {
  grant_type?: string;
  client_id?: string;
  client_secret?: string;
};

export type RequestCareersTokenResult =
  | { success: true; accessToken: string; expiresIn: number }
  | {
      success: false;
      code:
        | 'unsupported_grant_type'
        | 'invalid_request'
        | 'invalid_client'
        | 'server_error';
      errorDescription: string;
    };

/**
 * Validate client credentials and issue a Careers public API access token.
 * Caller handles HTTP body parsing and status codes.
 */
export async function requestCareersPublicToken(
  params: RequestCareersTokenParams
): Promise<RequestCareersTokenResult> {
  try {
    const { grant_type, client_id, client_secret } = params;

    if (grant_type !== 'client_credentials') {
      return {
        success: false,
        code: 'unsupported_grant_type',
        errorDescription: 'Only client_credentials is supported'
      };
    }

    const clientIdTrimmed = client_id?.trim();
    if (!clientIdTrimmed || !client_secret) {
      return {
        success: false,
        code: 'invalid_request',
        errorDescription: 'client_id and client_secret are required'
      };
    }

    const client = await prisma.apiClient.findUnique({
      where: { clientId: clientIdTrimmed },
      select: {
        clientSecretHash: true,
        isBlocked: true,
        scopes: true
      }
    });

    if (!client || client.isBlocked) {
      return {
        success: false,
        code: 'invalid_client',
        errorDescription: 'Invalid client or client is blocked'
      };
    }

    const valid = await argon2.verify(client.clientSecretHash, client_secret);
    if (!valid) {
      return {
        success: false,
        code: 'invalid_client',
        errorDescription: 'Invalid client credentials'
      };
    }

    const scopes = (client.scopes ?? []).filter(isPublicApiScopeId);
    const tokenScopes =
      scopes.length > 0 ? scopes : [...DEFAULT_PUBLIC_API_SCOPES];

    const { accessToken, expiresIn } = await issuePublicCareersToken(
      clientIdTrimmed,
      tokenScopes
    );
    return { success: true, accessToken, expiresIn };
  } catch (e) {
    console.error('[public/careers-token.service]', e);
    const message = e instanceof Error ? e.message : '';
    if (
      message.includes('PUBLIC_CAREERS_JWT_SECRET') ||
      message.includes('must be set for careers token')
    ) {
      return {
        success: false,
        code: 'server_error',
        errorDescription: 'Token signing is not configured'
      };
    }
    return {
      success: false,
      code: 'server_error',
      errorDescription: 'Internal error'
    };
  }
}
