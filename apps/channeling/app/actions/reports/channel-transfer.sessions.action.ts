"use server"

import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/server-permissions"
import moment from "moment"

export type ChannelTransferSessionOption = {
  id: string
  name: string
}

function parseDateTime(value: string, asEnd: boolean): Date | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (trimmed.includes("T")) {
    const d = new Date(trimmed)
    return Number.isFinite(d.getTime()) ? d : null
  }
  const [y, m, d] = trimmed.split("-").map(Number)
  if (!y || !m || !d) return null
  if (asEnd) return new Date(y, m - 1, d, 23, 59, 59, 999)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export async function getChannelTransferSessionOptionsAction(args: {
  dateFrom: string
  dateTo: string
  doctorId?: string
}): Promise<{ success: boolean; data?: ChannelTransferSessionOption[]; message?: string }> {
  await requirePermission("reports", "view")
  const from = parseDateTime(args.dateFrom, false)
  const to = parseDateTime(args.dateTo, true)
  if (!from || !to) {
    return { success: false, message: "From date and to date are required." }
  }
  if (from.getTime() > to.getTime()) {
    return { success: false, message: "From date must be before or equal to to date." }
  }
  // Session.date is a date field; derive day boundaries from the selected date-times.
  const fromDayStart = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0)
  const toDayEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)

  try {
    const doctorId = (args.doctorId ?? "").trim()
    const sessions = await prisma.session.findMany({
      where: {
        date: { gte: fromDayStart, lte: toDayEnd },
        ...(doctorId ? { doctorId } : {}),
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        doctor: { select: { title: true, name: true, code: true } },
        location: { select: { name: true, code: true } },
        department: { select: { name: true } },
      },
      take: 1000,
    })

    const data: ChannelTransferSessionOption[] = sessions
      .filter((s) => s.id)
      .map((s) => {
        const dateLabel = moment(s.date).format("YYYY-MM-DD")
        const startLabel = moment(s.startTime).format("hh:mm A")
        const endLabel = moment(s.endTime).format("hh:mm A")
        const doctorName = [s.doctor?.title, s.doctor?.name].filter(Boolean).join(" ").trim()
        const doctorCode = s.doctor?.code ? `(${s.doctor.code})` : ""
        const loc = s.location?.name ? `${s.location.name}${s.location.code ? ` (${s.location.code})` : ""}` : ""
        const dept = s.department?.name ? ` | ${s.department.name}` : ""
        const who = doctorName ? `${doctorName} ${doctorCode}`.trim() : "—"
        const where = loc ? ` | ${loc}` : ""
        return {
          id: s.id,
          name: `${dateLabel} ${startLabel}-${endLabel} | ${who}${where}${dept}`,
        }
      })

    return { success: true, data }
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to load sessions." }
  }
}

