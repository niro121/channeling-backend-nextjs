import { withPublicApiLog } from "@/lib/public-api-log"
import { NextRequest } from "next/server"
import { ayuError, ayuJson, ayuOptions, requireAyuStaffRead } from "@/lib/ayu-api-route"
import { getAyuStaffUserById } from "@/services/ayu-staff.service"

/**
 * GET /api/ayu/staff-users/[id] — one admin or staff user (404 for other user types).
 * Read-only. Requires scope ayu:staff:read.
 */
export async function OPTIONS() {
  return ayuOptions()
}

export const GET = withPublicApiLog(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAyuStaffRead(request)
  if ("response" in auth) return auth.response

  const { id } = await params
  const result = await getAyuStaffUserById(id)
  if (!result.success) {
    return ayuError(result.code === "not_found" ? 404 : 400, result.code, result.message)
  }
  return ayuJson({ user: result.data })
})
