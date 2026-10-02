import crypto from "crypto"
import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"

const MAX_BODY = 8000
const REDACT_KEYS = new Set([
  "client_secret",
  "clientSecret",
  "password",
  "access_token",
  "accessToken",
  "refresh_token",
  "token",
  "authorization",
  "digest",
])

function truncate(value: string): string {
  if (value.length <= MAX_BODY) return value
  return `${value.slice(0, MAX_BODY)}…[truncated]`
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACT_KEYS.has(key) ? "[redacted]" : redact(nested)
    }
    return out
  }
  return value
}

function sanitizeBody(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return truncate(JSON.stringify(redact(JSON.parse(trimmed))))
  } catch {
    try {
      const params = new URLSearchParams(trimmed)
      let touched = false
      for (const key of [...params.keys()]) {
        if (REDACT_KEYS.has(key)) {
          params.set(key, "[redacted]")
          touched = true
        }
      }
      if (touched) return truncate(params.toString())
    } catch {
      /* keep raw text */
    }
    return truncate(trimmed)
  }
}

function clientIdFromAuthorization(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) return null
  const part = header.slice(7).trim().split(".")[1]
  if (!part) return null
  try {
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { sub?: unknown }
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null
  } catch {
    return null
  }
}

function clientIdFromBody(raw: string | null): string | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { client_id?: unknown }
    if (typeof parsed.client_id === "string" && parsed.client_id) return parsed.client_id
  } catch {
    /* form body */
  }
  try {
    const clientId = new URLSearchParams(raw).get("client_id")
    return clientId || null
  } catch {
    return null
  }
}

function writeApiLog(data: {
  durationMs: number
  method: string
  endpoint: string
  uuid: string
  clientId: string | null
  statusCode: number
  errorStatus: boolean
  requestBody: string | null
  responseBody: string | null
}) {
  void prisma.apiLog
    .create({
      data: {
        durationMs: data.durationMs,
        method: data.method,
        endpoint: data.endpoint,
        uuid: data.uuid,
        clientId: data.clientId ?? undefined,
        statusCode: data.statusCode,
        errorStatus: data.errorStatus,
        requestBody: data.requestBody ?? undefined,
        responseBody: data.responseBody ?? undefined,
      },
    })
    .catch((err) => {
      console.error("[ApiLog] Failed to write public API log:", err)
    })
}

/**
 * Record one public API call (method, path, status, duration, redacted bodies).
 * Sets `x-request-id` on the response so that id can be searched on the API Log report.
 * OPTIONS is left to the route; do not wrap CORS preflight with this.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublicApiHandler = (request: NextRequest, ...args: any[]) => Promise<Response>

export function withPublicApiLog<T extends PublicApiHandler>(handler: T): T {
  return (async (request: NextRequest, ...args: unknown[]) => {
    const started = Date.now()
    const uuid = crypto.randomUUID()
    let requestRaw: string | null = null
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        requestRaw = await request.clone().text()
      } catch {
        requestRaw = null
      }
    }
    const url = new URL(request.url)
    const endpoint = `${request.method} ${url.pathname}${url.search}`
    const clientId =
      clientIdFromAuthorization(request.headers.get("authorization")) ??
      clientIdFromBody(requestRaw)

    try {
      const response = await handler(request, ...args)
      let responseRaw: string | null = null
      try {
        responseRaw = await response.clone().text()
      } catch {
        responseRaw = null
      }
      writeApiLog({
        durationMs: Date.now() - started,
        method: request.method,
        endpoint,
        uuid,
        clientId,
        statusCode: response.status,
        errorStatus: response.status >= 400,
        requestBody: sanitizeBody(requestRaw),
        responseBody: sanitizeBody(responseRaw),
      })
      const headers = new Headers(response.headers)
      headers.set("x-request-id", uuid)
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      writeApiLog({
        durationMs: Date.now() - started,
        method: request.method,
        endpoint,
        uuid,
        clientId,
        statusCode: 500,
        errorStatus: true,
        requestBody: sanitizeBody(requestRaw),
        responseBody: error instanceof Error ? truncate(error.message) : "Unhandled error",
      })
      throw error
    }
  }) as T
}
