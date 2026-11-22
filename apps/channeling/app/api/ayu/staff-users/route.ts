import { withPublicApiLog } from "@/lib/public-api-log"
import { NextRequest } from "next/server"
import { ayuError, ayuJson, ayuOptions, requireAyuStaffRead } from "@/lib/ayu-api-route"
import { searchAyuStaffUsers } from "@/services/ayu-staff.service"

/**
 * GET /api/ayu/staff-users?search=<text>&limit=<1-20> — admin and staff users whose name or
 * email contains `search` (min 2 chars). Read-only. Requires scope ayu:staff:read.
 */
export async function OPTIONS() {
  return ayuOptions()
}

export const GET = withPublicApiLog(async function GET(request: NextRequest) {
  const auth = await requireAyuStaffRead(request)
  if ("response" in auth) return auth.response

  const params = request.nextUrl.searchParams
  const result = await searchAyuStaffUsers(params.get("search"), params.get("limit"))
  if (!result.success) return ayuError(400, result.code, result.message)
  return ayuJson({ users: result.data })
})
