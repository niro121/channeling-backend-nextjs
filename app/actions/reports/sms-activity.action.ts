"use server"

import { z } from "zod"
import { checkRouteAccess } from "@/lib/server-permissions"
import { getSmsLogRecentService } from "@/services/reports/sms-log-recent.service"
import { getSmsActivityService } from "@/services/reports/sms-activity.service"

const smsActivitySchema = z.object({
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  status: z.enum(["all", "sent", "failed"]).optional(),
})

export async function getSmsActivityAction(
  raw: unknown
): Promise<Awaited<ReturnType<typeof getSmsActivityService>>> {
  try {
    await checkRouteAccess("/reports")
  } catch {
    return { success: false, message: "Permission denied" }
  }

  const parsed = smsActivitySchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: "Invalid date range" }
  }

  const dateFrom = new Date(parsed.data.dateFrom)
  const dateTo = new Date(parsed.data.dateTo)
  if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
    return { success: false, message: "Invalid date range" }
  }
  if (dateFrom > dateTo) {
    return { success: false, message: "From date/time must be before to date/time" }
  }

  return getSmsActivityService(dateFrom, dateTo, parsed.data.status ?? "all")
}

const smsLogRecentSchema = z.object({
  search: z.string().optional().nullable(),
})

export async function getSmsLogRecentAction(
  raw: unknown
): Promise<Awaited<ReturnType<typeof getSmsLogRecentService>>> {
  try {
    await checkRouteAccess("/reports")
  } catch {
    return { success: false, message: "Permission denied" }
  }

  const parsed = smsLogRecentSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, message: "Invalid input" }
  }

  return getSmsLogRecentService(parsed.data.search ?? null)
}
