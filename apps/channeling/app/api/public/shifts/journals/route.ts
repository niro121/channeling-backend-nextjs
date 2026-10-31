import { withPublicApiLog } from "@/lib/public-api-log"
import { NextRequest, NextResponse } from "next/server"
import { publicApiCorsHeaders } from "@/lib/public-api-cors"
import { getPublicApiClient } from "@/lib/public-api-auth"
import {
  listDpayJournalsByReference,
  postDpayJournal,
  type DpayJournalKind,
  type DpayJournalShare,
} from "@/services/public/dpay-journal.service"

function withCors(res: NextResponse) {
  Object.entries(publicApiCorsHeaders()).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

const KINDS = new Set<DpayJournalKind>([
  "patient_payment",
  "patient_refund",
  "doctor_payment",
  "doctor_payment_cancel",
])

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

/** GET /api/public/shifts/journals?referenceType=DpayReceipt&referenceId= */
export const GET = withPublicApiLog(async function GET(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) {
    return withCors(
      NextResponse.json(
        { error: "invalid_token", error_description: "Missing or invalid Bearer token" },
        { status: 401 }
      )
    )
  }

  const params = new URL(request.url).searchParams
  const result = await listDpayJournalsByReference({
    referenceType: params.get("referenceType") ?? "",
    referenceId: params.get("referenceId") ?? "",
  })
  if (!result.success) {
    return withCors(
      NextResponse.json({ error: "invalid_request", error_description: result.message }, { status: 400 })
    )
  }

  return withCors(NextResponse.json({ journals: result.journals }))
})

export const POST = withPublicApiLog(async function POST(request: NextRequest) {
  const client = await getPublicApiClient(request.headers, { recheckBlocked: true })
  if (!client) {
    return withCors(
      NextResponse.json(
        { error: "invalid_token", error_description: "Missing or invalid Bearer token" },
        { status: 401 }
      )
    )
  }

  const body = (await request.json().catch(() => null)) as {
    userId?: string
    shiftId?: string
    kind?: DpayJournalKind
    referenceId?: string
    description?: string
    paymentMethod?: number
    shares?: DpayJournalShare[]
    whtAmount?: number
  } | null

  if (!body || !body.kind || !KINDS.has(body.kind)) {
    return withCors(
      NextResponse.json({ error: "invalid_request", error_description: "Journal kind is required." }, { status: 400 })
    )
  }

  const result = await postDpayJournal({
    userId: body.userId ?? "",
    shiftId: body.shiftId ?? "",
    kind: body.kind,
    referenceId: body.referenceId,
    description: body.description ?? "",
    paymentMethod: Number(body.paymentMethod),
    shares: Array.isArray(body.shares) ? body.shares : [],
    whtAmount: body.whtAmount,
  })

  if (!result.success) {
    return withCors(
      NextResponse.json({ error: "journal_failed", error_description: result.message }, { status: 400 })
    )
  }

  return withCors(NextResponse.json({ journalId: result.journalId }))
})
