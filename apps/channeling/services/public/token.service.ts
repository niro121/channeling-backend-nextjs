import * as argon2 from "argon2"
import prisma from "@/lib/prisma"
import { issuePublicApiToken } from "@/lib/public-api-auth"

const DEFAULT_EXPIRES_IN_SEC = 3600

export type RequestTokenParams = {
  grant_type?: string
  client_id?: string
  client_secret?: string
}

export type RequestTokenResult =
  | { success: true; accessToken: string; expiresIn: number }
  | {
      success: false
      code: "unsupported_grant_type" | "invalid_request" | "invalid_client" | "server_error"
      errorDescription: string
    }

/**
 * Validate client credentials and issue an access token (OAuth2 client credentials).
 * Caller is responsible for HTTP (body parsing, response status).
 */
export async function requestPublicApiToken(
  params: RequestTokenParams,
  expiresInSec: number = DEFAULT_EXPIRES_IN_SEC
): Promise<RequestTokenResult> {
  try {
    const { grant_type, client_id, client_secret } = params

    if (grant_type !== "client_credentials") {
      return {
        success: false,
        code: "unsupported_grant_type",
        errorDescription: "Only client_credentials is supported",
      }
    }

    const clientIdTrimmed = client_id?.trim()
    if (!clientIdTrimmed || !client_secret) {
      return {
        success: false,
        code: "invalid_request",
        errorDescription: "client_id and client_secret are required",
      }
    }

    const client = await (
      prisma as unknown as {
        apiClient: {
          findUnique: (args: unknown) => Promise<{ clientSecretHash: string; isBlocked: boolean } | null>
        }
      }
    ).apiClient.findUnique({
        where: { clientId: clientIdTrimmed },
        select: { clientSecretHash: true, isBlocked: true },
      })

    if (!client || client.isBlocked) {
      return {
        success: false,
        code: "invalid_client",
        errorDescription: "Invalid client or client is blocked",
      }
    }

    const valid = await argon2.verify(client.clientSecretHash, client_secret)
    if (!valid) {
      return {
        success: false,
        code: "invalid_client",
        errorDescription: "Invalid client credentials",
      }
    }

    const { accessToken, expiresIn } = await issuePublicApiToken(clientIdTrimmed, expiresInSec)
    return { success: true, accessToken, expiresIn }
  } catch (e) {
    console.error("[public/token.service]", e)
    return {
      success: false,
      code: "server_error",
      errorDescription: "Internal error",
    }
  }
}
