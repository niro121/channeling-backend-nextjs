"use server"

import prisma from "@/lib/prisma"

/** Cost per SMS in LKR (override via env SMS_COST_PER_MESSAGE). */
const DEFAULT_SMS_COST = 0.05
function getCostPerSms(): number {
  const env = process.env.SMS_COST_PER_MESSAGE
  if (env != null && env !== "") {
    const n = Number(env)
    if (!Number.isNaN(n) && n >= 0) return n
  }
  return DEFAULT_SMS_COST
}

/** Normalize log name to "type" (e.g. "Session SMS Sent" -> "Session SMS", "Transfer Failed" -> "Transfer"). */
function typeFromName(name: string): string {
  const t = name.replace(/\s+(Sent|Failed)$/i, "").trim()
  return t || name
}

export type SmsActivityDailyRow = {
  date: string // YYYY-MM-DD
  sent: number
  failed: number
}

export type SmsActivityByTypeRow = {
  type: string
  sent: number
  failed: number
}

export type SmsActivityResult = {
  success: boolean
  data?: {
    daily: SmsActivityDailyRow[]
    byType: SmsActivityByTypeRow[]
    totalSent: number
    totalFailed: number
    estimatedCost: number | null // null if cost not configured
    recentFailures: { id: string; createdAt: Date; name: string; description: string | null; phone: string }[]
  }
  message?: string
}

export async function getSmsActivityService(
  dateFrom: Date,
  dateTo: Date
): Promise<SmsActivityResult> {
  try {
    const start = new Date(dateFrom)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)

    const logs = await prisma.smsLog.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        status: true,
        name: true,
        description: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })

    const dailyMap = new Map<string, { sent: number; failed: number }>()
    const typeMap = new Map<string, { sent: number; failed: number }>()
    let totalSent = 0
    let totalFailed = 0

    for (const row of logs) {
      const dateKey = row.createdAt.toISOString().slice(0, 10)
      if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { sent: 0, failed: 0 })
      const day = dailyMap.get(dateKey)!
      if (row.status === 0) {
        day.sent++
        totalSent++
      } else {
        day.failed++
        totalFailed++
      }

      const type = typeFromName(row.name)
      if (!typeMap.has(type)) typeMap.set(type, { sent: 0, failed: 0 })
      const typeRow = typeMap.get(type)!
      if (row.status === 0) typeRow.sent++
      else typeRow.failed++
    }

    const daily: SmsActivityDailyRow[] = Array.from(dailyMap.entries())
      .map(([date, v]) => ({ date, sent: v.sent, failed: v.failed }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const byType: SmsActivityByTypeRow[] = Array.from(typeMap.entries()).map(
      ([type, v]) => ({ type, sent: v.sent, failed: v.failed })
    )
    byType.sort((a, b) => (b.sent + b.failed) - (a.sent + a.failed))

    const recentFailures = logs
      .filter((r) => r.status === 1)
      .slice(-20)
      .reverse()
      .map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        name: r.name,
        description: r.description,
        phone: r.phone,
      }))

    const costPerSms = getCostPerSms()
    const estimatedCost = totalSent * costPerSms

    return {
      success: true,
      data: {
        daily,
        byType,
        totalSent,
        totalFailed,
        estimatedCost,
        recentFailures,
      },
    }
  } catch (e) {
    console.error("getSmsActivityService error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to load SMS activity.",
    }
  }
}
