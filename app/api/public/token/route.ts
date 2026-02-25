import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { requestPublicApiToken } from "@/services/public/token.service"

const EXPIRES_IN_SEC = 3600

function parseBody(request: NextRequest): Promise<{
  grant_type?: string
  client_id?: string
  client_secret?: string
}> {
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return request.json() as Promise<{
      grant_type?: string
      client_id?: string
      client_secret?: string
    }>
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("application/x-www-form-urlencoded;")
  ) {
    return request.text().then((text) => {
      const params = new URLSearchParams(text)
      return {
        grant_type: params.get("grant_type") ?? undefined,
        client_id: params.get("client_id") ?? undefined,
        client_secret: params.get("client_secret") ?? undefined,
      }
    })
  }
  return Promise.resolve({})
}

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function POST(request: NextRequest) {
  const body = await parseBody(request)
  const result = await requestPublicApiToken(body, EXPIRES_IN_SEC)

  if (!result.success) {
    const status =
      result.code === "unsupported_grant_type" || result.code === "invalid_request"
        ? 400
        : result.code === "invalid_client"
          ? 401
          : 500
    return withCors(
      NextResponse.json(
        { error: result.code, error_description: result.errorDescription },
        { status }
      )
    )
  }

  return withCors(
    NextResponse.json({
      access_token: result.accessToken,
      token_type: "Bearer",
      expires_in: result.expiresIn,
    })
  )
}
