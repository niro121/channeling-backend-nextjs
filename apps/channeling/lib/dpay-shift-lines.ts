import crypto from "crypto"
import { recordOutboundApiLog } from "@/lib/public-api-log"
import { recordDpayAlert, resolveDpayAlerts } from "@/services/system-alert.service"

export const DPAY_NOT_RESPONDING = "DPAY is not responding. Try again."
export const DPAY_NOT_CONNECTED = "DPAY is not connected."
export const DPAY_REJECTED = "DPAY rejected the connection. The shared secret does not match."

/** Stop before the host's 30s limit so Channeling can still return this message. */
const DPAY_FETCH_TIMEOUT_MS = 28_000
const OUTBOUND_CLIENT_ID = "channeling-to-dpay"
const OUTBOUND_ENDPOINT = "POST /api/internal/shift-lines"

export type DpayShiftLine = {
  shiftId: string
  kind: "patient_receipt" | "patient_refund" | "doctor_payment" | "doctor_payment_cancel"
  receiptNumber: string
  at: string
  paymentMethod: number
  amount: number
  patientName: string | null
  doctorName: string | null
  billNumber: string | null
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
}

function logCall(input: {
  started: number
  uuid: string
  statusCode: number
  errorStatus: boolean
  requestBody: string
  responseBody: string
}) {
  recordOutboundApiLog({
    durationMs: Date.now() - input.started,
    method: "POST",
    endpoint: OUTBOUND_ENDPOINT,
    uuid: input.uuid,
    clientId: OUTBOUND_CLIENT_ID,
    statusCode: input.statusCode,
    errorStatus: input.errorStatus,
    requestBody: input.requestBody,
    responseBody: input.responseBody,
  })
}

export async function fetchDpayShiftLines(shiftIds: string[]): Promise<DpayShiftLine[]> {
  const ids = [...new Set(shiftIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) return []

  const started = Date.now()
  const uuid = crypto.randomUUID()
  const requestBody = JSON.stringify({ shiftIds: ids })
  let logged = false
  const logOnce = (input: Omit<Parameters<typeof logCall>[0], "started" | "uuid" | "requestBody">) => {
    if (logged) return
    logged = true
    logCall({ started, uuid, requestBody, ...input })
  }
  const baseUrl = process.env.DPAY_API_URL?.replace(/\/$/, "")
  const secret = process.env.DPAY_SHIFT_LINES_SECRET?.trim()

  if (!baseUrl || !secret) {
    logOnce({
      statusCode: 503,
      errorStatus: true,
      responseBody: DPAY_NOT_CONNECTED,
    })
    await recordDpayAlert("not_connected", DPAY_NOT_CONNECTED)
    throw new Error(DPAY_NOT_CONNECTED)
  }

  try {
    const res = await fetch(`${baseUrl}/api/internal/shift-lines`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dpay-shift-secret": secret,
      },
      body: requestBody,
      cache: "no-store",
      signal: AbortSignal.timeout(DPAY_FETCH_TIMEOUT_MS),
    })
    const responseBody = await res.text()
    logOnce({
      statusCode: res.status,
      errorStatus: !res.ok,
      responseBody: responseBody || res.statusText,
    })
    if (res.status === 401) {
      await recordDpayAlert("rejected", DPAY_REJECTED)
      throw new Error(DPAY_REJECTED)
    }
    if (!res.ok) {
      await recordDpayAlert("unreachable", DPAY_NOT_RESPONDING)
      throw new Error(DPAY_NOT_RESPONDING)
    }
    const data = JSON.parse(responseBody) as { lines?: DpayShiftLine[] }
    await resolveDpayAlerts()
    return Array.isArray(data.lines) ? data.lines : []
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error.message === DPAY_NOT_RESPONDING || error.message === DPAY_REJECTED || error.message === DPAY_NOT_CONNECTED)
    ) {
      throw error
    }
    const timedOut = isTimeout(error)
    const message = DPAY_NOT_RESPONDING
    logOnce({
      statusCode: timedOut ? 504 : 503,
      errorStatus: true,
      responseBody: error instanceof Error ? error.message : message,
    })
    await recordDpayAlert(timedOut ? "timeout" : "unreachable", message)
    throw new Error(message)
  }
}
