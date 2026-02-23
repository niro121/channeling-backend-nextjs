import prisma from "@/lib/prisma"

const MOBITEL_SMS_USER = "esmsusr_ete"
const MOBITEL_SMS_API_PASSWORD = "ICT#403!ruhunu"
const MOBITEL_SMS_URL = "https://msmsenterpriseapi.mobitel.lk/EnterpriseSMSV3/esmsproxyURL.php"

const DEFAULT_FROM = "Ruhunu Hosp"
const MOBITEL_RESULT_SUCCESS = 200

export type SendSmsResult = {
  status: boolean
  error?: string
  description?: string
}

export type SendSmsOptions = {
  /** Sender name (default: "Ruhunu Hosp") */
  from?: string
  /** Label for SmsLog name (e.g. "Booking", "2FA") – used in success/failure log entry */
  logName?: string
  /** If true, do not write to SmsLog (default: false) */
  skipLog?: boolean
}

/**
 * Reusable SMS sender for any task (booking, 2FA, notifications, etc.).
 * Uses Mobitel API: MOBITEL_SMS_USER, MOBITEL_SMS_API_PASSWORD, MOBITEL_SMS_URL from env.
 * Logs to SmsLog unless skipLog: true.
 * @param phone - Single number or comma-separated numbers for bulk send (same message to all).
 */
export async function sendSms(
  phone: string,
  text: string,
  options: SendSmsOptions = {}
): Promise<SendSmsResult> {
  const { from = DEFAULT_FROM, logName = "SMS", skipLog = false } = options
  const result: SendSmsResult = {
    status: false,
    error: "",
    description: "",
  }

  if (!MOBITEL_SMS_USER || !MOBITEL_SMS_API_PASSWORD || !MOBITEL_SMS_URL) {
    result.error = "SMS config missing (MOBITEL_SMS_* env)"
    return result
  }

  try {
    const body = {
      username: MOBITEL_SMS_USER,
      password: MOBITEL_SMS_API_PASSWORD,
      from,
      to: phone,
      text,
      mesageType: 1,
    }

    // console.log("SMS BODY", body)

    const res = await fetch(MOBITEL_SMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as { resultcode?: number | string }

    // Mobitel API may return resultcode as string "200" or number 200
    const code = data.resultcode != null ? Number(data.resultcode) : undefined
    if (code === MOBITEL_RESULT_SUCCESS) {
      result.status = true
    } else {
      result.status = false
      result.error = "SMS ERROR"
    }

    if (!skipLog) {
      await prisma.smsLog.create({
        data: {
          status: result.status ? 0 : 1,
          name: result.status ? `${logName} Sent` : `${logName} Failed`,
          description: result.status ? "Success" : (result.error ?? "failed"),
          phone,
          template: text,
        },
      })
    }
  } catch (e) {
    result.status = false
    result.error = "SMS EXCEPTION"
    result.description = e instanceof Error ? e.message : String(e)
    console.error("sendSms error", e)

    if (!skipLog) {
      await prisma.smsLog.create({
        data: {
          status: 1,
          name: `${logName} Failed`,
          description: result.description ?? "",
          phone,
          template: text,
        },
      })
    }
  }

  return result
}
