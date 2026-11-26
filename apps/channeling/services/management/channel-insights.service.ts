import "server-only"
import prisma from "@/lib/prisma"
import { getColomboYmd } from "@/lib/dashboard-date-range"
import { hasPermission } from "@/lib/permissions"
import { formatTimeSriLanka, normalizeSessionTime } from "@/lib/utils"
import { BOOKING_METHODS } from "@/types/channel-booking"
import type { Permissions } from "@/types/user-group"
import {
  INSIGHT_MODULES,
  INSIGHT_RESOURCE,
  type Change,
  type InsightData,
  type InsightModule,
  type InsightRange,
} from "@/types/management-insights"

/**
 * Channel insights for the management app Overview. Uses the same definitions as the
 * channeling dashboard (services/dashboard/get-dashboard-metrics.service.ts):
 * booking status 0 = unpaid, 1 = paid, 2 = cancelled; revenue = paid amount minus the
 * refund magnitude; days are session dates (Session.date is UTC midnight of the calendar day).
 */

const UNPAID = 0
const PAID = 1
const CANCELLED = 2
const ON_CALL = 1
const ATTENDANCE_SHOWN = 1
const ATTENDANCE_NO_SHOW = 2
const ACTIVE_SESSION = 1
const MAX_RANGE_DAYS = 92
const DAY_MS = 86_400_000
const COLOMBO_OFFSET_MS = 330 * 60_000
const FILLING_FAST = 0.8
const UNDER_BOOKED = 0.3
/** Tiny sessions (a few slots) would always look full or empty; leave them out of the flags. */
const MIN_FLAG_CAPACITY = 5

// ── Access ───────────────────────────────────────────────────────────────────────────────

export function allowedInsightModules(
  permissions: Permissions | null | undefined,
  isAdmin: boolean
): InsightModule[] {
  if (isAdmin) return [...INSIGHT_MODULES]
  return INSIGHT_MODULES.filter((m) => hasPermission(permissions, INSIGHT_RESOURCE, m))
}

export function isInsightModule(value: string): value is InsightModule {
  return (INSIGHT_MODULES as readonly string[]).includes(value)
}

// ── Range ────────────────────────────────────────────────────────────────────────────────

const YMD = /^\d{4}-\d{2}-\d{2}$/

function ymdToUtc(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number)
  return Date.UTC(y, m - 1, d)
}

function utcToYmd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Validates from/to (YYYY-MM-DD, at most 92 days); defaults to today in Colombo. */
export function resolveInsightRange(
  from?: string | null,
  to?: string | null
): { ok: true; range: InsightRange } | { ok: false; message: string } {
  const today = getColomboYmd()
  const f = from?.trim() || to?.trim() || today
  const t = to?.trim() || f
  if (!YMD.test(f) || !YMD.test(t) || Number.isNaN(ymdToUtc(f)) || Number.isNaN(ymdToUtc(t))) {
    return { ok: false, message: "Dates must be YYYY-MM-DD." }
  }
  const start = ymdToUtc(f)
  const end = ymdToUtc(t)
  if (end < start) return { ok: false, message: "The end date is before the start date." }
  const days = Math.round((end - start) / DAY_MS) + 1
  if (days > MAX_RANGE_DAYS) return { ok: false, message: `Pick ${MAX_RANGE_DAYS} days or fewer.` }
  return {
    ok: true,
    range: {
      from: f,
      to: t,
      days,
      previousFrom: utcToYmd(start - days * DAY_MS),
      previousTo: utcToYmd(start - DAY_MS),
    },
  }
}

function sessionDateWhere(from: string, to: string) {
  return { gte: new Date(ymdToUtc(from)), lte: new Date(ymdToUtc(to) + DAY_MS - 1) }
}

// ── Data (one load per range, shared by every module for a minute) ───────────────────────

type BookingRow = Awaited<ReturnType<typeof queryBookings>>[number]
type SessionRow = Awaited<ReturnType<typeof querySessions>>[number]
type Dataset = { bookings: BookingRow[]; sessions: SessionRow[] }

function queryBookings(from: string, to: string) {
  return prisma.booking.findMany({
    where: { session: { date: sessionDateWhere(from, to) } },
    select: {
      status: true,
      method: true,
      amount: true,
      refundAmount: true,
      createdAt: true,
      channelRoomAttendance: true,
      doctorId: true,
      sessionId: true,
      session: { select: { date: true, startTime: true } },
    },
  })
}

function querySessions(from: string, to: string) {
  return prisma.session.findMany({
    where: { date: sessionDateWhere(from, to), status: ACTIVE_SESSION },
    select: {
      id: true,
      date: true,
      startTime: true,
      doctorId: true,
      startingPatientNumber: true,
      maxPatientNumber: true,
    },
  })
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, { at: number; data: Promise<Dataset> }>()

function loadDataset(from: string, to: string): Promise<Dataset> {
  const key = `${from}|${to}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
  const data = Promise.all([queryBookings(from, to), querySessions(from, to)]).then(
    ([bookings, sessions]) => ({ bookings, sessions })
  )
  data.catch(() => cache.delete(key))
  cache.set(key, { at: Date.now(), data })
  if (cache.size > 50) {
    for (const [k, v] of cache) if (Date.now() - v.at >= CACHE_TTL_MS) cache.delete(k)
  }
  return data
}

// ── Helpers ──────────────────────────────────────────────────────────────────────────────

const isActive = (b: BookingRow) => b.status === UNPAID || b.status === PAID
const nett = (b: BookingRow) =>
  b.status === PAID ? Math.max(0, Number(b.amount ?? 0) - Math.abs(Number(b.refundAmount ?? 0))) : 0
const sum = (rows: BookingRow[], fn: (b: BookingRow) => number) => rows.reduce((s, b) => s + fn(b), 0)

function change(current: number, previous: number): Change {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / previous
}

function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null
}

function capacityOf(s: SessionRow): number {
  return Math.max(0, (s.maxPatientNumber ?? 0) - (s.startingPatientNumber ?? 1) + 1)
}

function sessionStart(s: { date: Date; startTime: Date }): Date {
  return normalizeSessionTime(s.startTime as Date | number, new Date(s.date))
}

function colomboHour(d: Date): number {
  return new Date(d.getTime() + COLOMBO_OFFSET_MS).getUTCHours()
}

function colomboDayMs(d: Date): number {
  const shifted = new Date(d.getTime() + COLOMBO_OFFSET_MS)
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
}

function activeCountBySession(bookings: BookingRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const b of bookings) {
    if (!b.sessionId || !isActive(b)) continue
    map.set(b.sessionId, (map.get(b.sessionId) ?? 0) + 1)
  }
  return map
}

async function doctorLabels(ids: string[]) {
  const rows = ids.length
    ? await prisma.doctor.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, name: true, speciality: { select: { name: true } } },
      })
    : []
  return new Map(
    rows.map((d) => [
      d.id,
      {
        name: [d.title, d.name].filter(Boolean).join(" ").trim() || "—",
        speciality: d.speciality?.name ?? null,
      },
    ])
  )
}

// ── Modules ──────────────────────────────────────────────────────────────────────────────

type Ctx = { range: InsightRange; current: Dataset; previous: Dataset }

const builders: { [K in InsightModule]: (ctx: Ctx) => Promise<InsightData[K]> | InsightData[K] } = {
  revenue: ({ range, current, previous }) => {
    const value = sum(current.bookings, nett)
    const prev = sum(previous.bookings, nett)
    const paidBookings = current.bookings.filter((b) => b.status === PAID).length
    const byDay = new Map<string, number>()
    for (let i = 0; i < range.days; i++) byDay.set(utcToYmd(ymdToUtc(range.from) + i * DAY_MS), 0)
    for (const b of current.bookings) {
      if (!b.session) continue
      const day = new Date(b.session.date).toISOString().slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + nett(b))
    }
    return {
      value,
      previous: prev,
      change: change(value, prev),
      paidBookings,
      averagePerBooking: paidBookings ? value / paidBookings : 0,
      series: [...byDay].map(([date, v]) => ({ date, value: v })),
    }
  },

  bookings: ({ current, previous }) => {
    const active = current.bookings.filter(isActive)
    const prevActive = previous.bookings.filter(isActive)
    const channels = BOOKING_METHODS.map((m) => {
      const rows = active.filter((b) => b.method === m.id)
      const prevCount = prevActive.filter((b) => b.method === m.id).length
      return {
        method: m.id,
        name: m.name,
        bookings: rows.length,
        revenue: sum(rows, nett),
        share: active.length ? rows.length / active.length : 0,
        previousBookings: prevCount,
        change: change(rows.length, prevCount),
      }
    })
      .filter((c) => c.bookings > 0 || c.previousBookings > 0)
      .sort((a, b) => b.bookings - a.bookings)
    return {
      total: active.length,
      paid: active.filter((b) => b.status === PAID).length,
      unpaid: active.filter((b) => b.status === UNPAID).length,
      cancelled: current.bookings.filter((b) => b.status === CANCELLED).length,
      previousTotal: prevActive.length,
      change: change(active.length, prevActive.length),
      channels,
    }
  },

  "top-doctors": async ({ current, previous }) => {
    const stats = new Map<string, { bookings: number; revenue: number }>()
    for (const b of current.bookings) {
      if (!isActive(b)) continue
      const s = stats.get(b.doctorId) ?? { bookings: 0, revenue: 0 }
      s.bookings += 1
      s.revenue += nett(b)
      stats.set(b.doctorId, s)
    }
    const top = [...stats].sort((a, b) => b[1].bookings - a[1].bookings).slice(0, 10)
    const ids = top.map(([id]) => id)
    const labels = await doctorLabels(ids)
    const prevCounts = new Map<string, number>()
    for (const b of previous.bookings) {
      if (isActive(b)) prevCounts.set(b.doctorId, (prevCounts.get(b.doctorId) ?? 0) + 1)
    }
    const booked = activeCountBySession(current.bookings)
    return {
      doctors: top.map(([doctorId, s]) => {
        const sessions = current.sessions.filter((x) => x.doctorId === doctorId)
        const capacity = sessions.reduce((c, x) => c + capacityOf(x), 0)
        const bookedInSessions = sessions.reduce((c, x) => c + (booked.get(x.id) ?? 0), 0)
        const prev = prevCounts.get(doctorId) ?? 0
        return {
          doctorId,
          name: labels.get(doctorId)?.name ?? "—",
          speciality: labels.get(doctorId)?.speciality ?? null,
          bookings: s.bookings,
          revenue: s.revenue,
          sessions: sessions.length,
          fillRate: ratio(bookedInSessions, capacity),
          previousBookings: prev,
          change: change(s.bookings, prev),
        }
      }),
    }
  },

  "session-fill": async ({ current, previous }) => {
    const fill = (data: Dataset) => {
      const booked = activeCountBySession(data.bookings)
      let capacity = 0
      let bookedTotal = 0
      for (const s of data.sessions) {
        capacity += capacityOf(s)
        bookedTotal += Math.min(booked.get(s.id) ?? 0, capacityOf(s))
      }
      return { booked, capacity, bookedTotal }
    }
    const now = fill(current)
    const prev = fill(previous)
    const nowMs = Date.now()
    const rows = current.sessions
      .filter((s) => capacityOf(s) > 0)
      .map((s) => {
        const booked = now.booked.get(s.id) ?? 0
        return { s, booked, capacity: capacityOf(s), rate: booked / capacityOf(s), start: sessionStart(s) }
      })
    const upcoming = rows.filter((r) => r.start.getTime() > nowMs && r.capacity >= MIN_FLAG_CAPACITY)
    const pick = [...upcoming.filter((r) => r.rate >= FILLING_FAST).sort((a, b) => b.rate - a.rate).slice(0, 5),
      ...upcoming.filter((r) => r.rate < UNDER_BOOKED).sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 5)]
    const labels = await doctorLabels([...new Set(pick.map((r) => r.s.doctorId).filter((id): id is string => !!id))])
    const toRow = (r: (typeof rows)[number]) => ({
      sessionId: r.s.id,
      doctorName: (r.s.doctorId && labels.get(r.s.doctorId)?.name) || "—",
      date: new Date(r.s.date).toISOString().slice(0, 10),
      time: formatTimeSriLanka(r.start).replace(".", ":"),
      booked: r.booked,
      capacity: r.capacity,
      fillRate: r.rate,
    })
    return {
      sessions: current.sessions.length,
      capacity: now.capacity,
      booked: now.bookedTotal,
      fillRate: ratio(now.bookedTotal, now.capacity),
      previousFillRate: ratio(prev.bookedTotal, prev.capacity),
      fullSessions: rows.filter((r) => r.booked >= r.capacity).length,
      fillingFast: pick.filter((r) => r.rate >= FILLING_FAST).map(toRow),
      underBooked: pick.filter((r) => r.rate < UNDER_BOOKED).map(toRow),
    }
  },

  "booking-behaviour": ({ current }) => {
    const active = current.bookings.filter((b) => isActive(b) && b.session)
    const byHour = Array.from({ length: 24 }, () => 0)
    const leadTime = { sameDay: 0, oneToTwoDays: 0, threeToSevenDays: 0, moreThanWeek: 0 }
    let leadTotal = 0
    for (const b of active) {
      byHour[colomboHour(new Date(b.createdAt))] += 1
      const lead = Math.max(
        0,
        Math.round((new Date(b.session!.date).getTime() - colomboDayMs(new Date(b.createdAt))) / DAY_MS)
      )
      leadTotal += lead
      if (lead === 0) leadTime.sameDay += 1
      else if (lead <= 2) leadTime.oneToTwoDays += 1
      else if (lead <= 7) leadTime.threeToSevenDays += 1
      else leadTime.moreThanWeek += 1
    }
    const max = Math.max(...byHour)
    return {
      total: active.length,
      byHour,
      peakHour: max > 0 ? byHour.indexOf(max) : null,
      leadTime,
      averageLeadDays: active.length ? leadTotal / active.length : null,
    }
  },

  leakage: ({ current }) => {
    const all = current.bookings
    const cancelled = all.filter((b) => b.status === CANCELLED).length
    const paid = all.filter((b) => b.status === PAID)
    const marked = paid.filter(
      (b) => b.channelRoomAttendance === ATTENDANCE_SHOWN || b.channelRoomAttendance === ATTENDANCE_NO_SHOW
    )
    const noShow = marked.filter((b) => b.channelRoomAttendance === ATTENDANCE_NO_SHOW).length
    const nowMs = Date.now()
    const onCallPast = all.filter(
      (b) => b.method === ON_CALL && b.status !== CANCELLED && b.session && sessionStart(b.session).getTime() < nowMs
    )
    const onCallUnpaid = onCallPast.filter((b) => b.status === UNPAID)
    return {
      bookings: all.length,
      cancelled,
      cancelRate: ratio(cancelled, all.length),
      refundAmount: sum(all, (b) => Math.abs(Number(b.refundAmount ?? 0))),
      marked: marked.length,
      noShow,
      noShowRate: ratio(noShow, marked.length),
      onCallPast: onCallPast.length,
      onCallUnpaid: onCallUnpaid.length,
      onCallConversion: ratio(onCallPast.length - onCallUnpaid.length, onCallPast.length),
      unpaidValue: sum(onCallUnpaid, (b) => Number(b.amount ?? 0)),
    }
  },

  specialities: async ({ current, previous }) => {
    const ids = [...new Set([...current.bookings, ...previous.bookings].map((b) => b.doctorId))]
    const labels = await doctorLabels(ids)
    const tally = (rows: BookingRow[]) => {
      const map = new Map<string, { bookings: number; revenue: number }>()
      for (const b of rows) {
        if (!isActive(b)) continue
        const name = labels.get(b.doctorId)?.speciality ?? "Other"
        const s = map.get(name) ?? { bookings: 0, revenue: 0 }
        s.bookings += 1
        s.revenue += nett(b)
        map.set(name, s)
      }
      return map
    }
    const now = tally(current.bookings)
    const prev = tally(previous.bookings)
    return {
      specialities: [...now]
        .sort((a, b) => b[1].bookings - a[1].bookings)
        .slice(0, 8)
        .map(([name, s]) => {
          const p = prev.get(name)?.bookings ?? 0
          return { name, bookings: s.bookings, revenue: s.revenue, previousBookings: p, change: change(s.bookings, p) }
        }),
    }
  },
}

/** One module for a range. Callers check allowedInsightModules first. */
export async function getChannelInsight<K extends InsightModule>(
  module: K,
  range: InsightRange
): Promise<InsightData[K]> {
  const [current, previous] = await Promise.all([
    loadDataset(range.from, range.to),
    loadDataset(range.previousFrom, range.previousTo),
  ])
  return builders[module]({ range, current, previous })
}
