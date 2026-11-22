import "server-only"
import { NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { checkPublicApiScope, type PublicApiClientContext } from "@/lib/public-api-auth"
import { AYU_STAFF_READ_SCOPE } from "@/lib/api-client-scopes"

/** Same CORS headers as /api/public/*. */
export function ayuJson(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status })
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export function ayuError(status: number, error: string, description: string) {
  return ayuJson({ error, error_description: description }, status)
}

export function ayuOptions() {
  const res = new NextResponse(null, { status: 204 })
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

/**
 * Auth for every /api/ayu/staff-users route: a Bearer token from /api/public/token whose client
 * is not blocked (else 401) and has the ayu:staff:read scope (else 403).
 */
export async function requireAyuStaffRead(
  request: Request
): Promise<{ client: PublicApiClientContext } | { response: NextResponse }> {
  const result = await checkPublicApiScope(request.headers, AYU_STAFF_READ_SCOPE)
  if (result.ok) return { client: result.client }
  if (result.reason === "forbidden") {
    return {
      response: ayuError(403, "insufficient_scope", `This API client needs the ${AYU_STAFF_READ_SCOPE} scope`),
    }
  }
  return { response: ayuError(401, "invalid_token", "Missing or invalid Bearer token") }
}
