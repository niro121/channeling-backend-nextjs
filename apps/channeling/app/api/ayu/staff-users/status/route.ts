import { withPublicApiLog } from "@/lib/public-api-log"
import { NextRequest } from "next/server"
import { ayuError, ayuJson, ayuOptions, requireAyuStaffRead } from "@/lib/ayu-api-route"
import { getAyuStaffStatuses } from "@/services/ayu-staff.service"

/**
 * POST /api/ayu/staff-users/status — body { ids: string[] } (max 200). A query sent as POST so
 * long id lists fit; nothing is written. Unknown or non-staff ids come back inactive.
 * Requires scope ayu:staff:read.
 */
export async function OPTIONS() {
  return ayuOptions()
}

export const POST = withPublicApiLog(async function POST(request: NextRequest) {
  const auth = await requireAyuStaffRead(request)
  if ("response" in auth) return auth.response

  let body: { ids?: unknown }
  try {
    body = (await request.json()) as { ids?: unknown }
  } catch {
    return ayuError(400, "invalid_request", "Invalid JSON body")
  }
  const result = await getAyuStaffStatuses(body?.ids)
  if (!result.success) return ayuError(400, result.code, result.message)
  return ayuJson({ statuses: result.data })
})
