"use server"

import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/server-permissions"
import moment from "moment"

export type ChannelTransferSessionOption = {
  id: string
  name: string
}

function parseLocalDay(dateStr: string): { start: Date; end: Date } | null {
  const s = (dateStr ?? "").trim()
  if (!s) return null
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return null
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d, 23, 59, 59, 999)
  return { start, end }
}

export async function getChannelTransferSessionOptionsAction(args: {
  dateFrom: string
  dateTo: string
  doctorId?: string
}): Promise<{ success: boolean; data?: ChannelTransferSessionOption[]; message?: string }> {
  await requirePermission("reports", "view")
  const from = parseLocalDay(args.dateFrom)
  const to = parseLocalDay(args.dateTo)
  if (!from || !to) {
    return { success: false, message: "From date and to date are required." }
  }
  if (from.start.getTime() > to.end.getTime()) {
    return { success: false, message: "From date must be before or equal to to date." }
  }

  try {
    const doctorId = (args.doctorId ?? "").trim()
    const sessions = await prisma.session.findMany({
      where: {
        date: { gte: from.start, lte: to.end },
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

