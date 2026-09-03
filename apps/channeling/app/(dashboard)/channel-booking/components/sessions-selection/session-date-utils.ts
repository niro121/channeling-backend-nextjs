import type { DoctorSession } from "@/types/doctor.session"
import type { Location } from "@/types/location"

/** Day of week as in DoctorSession.dayType: 1=Sun, 2=Mon, ..., 7=Sat */
export function getDayTypeFromDate(date: Date): number {
  const jsDay = date.getDay()
  return jsDay === 0 ? 7 : jsDay
}

/** Whether a session applies to the given date (by weekday or specific applyTo). */
export function sessionMatchesDate(session: DoctorSession, date: Date): boolean {
  if (session.dayType === 8) {
    if (!session.applyTo) return false
    const d = session.applyTo instanceof Date ? session.applyTo : new Date(session.applyTo)
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    )
  }
  return session.dayType === getDayTypeFromDate(date)
}

/** Filter sessions that apply to the given date. */
export function getSessionsForDate(
  sessions: DoctorSession[],
  date: Date | null
): DoctorSession[] {
  if (!date) return []
  return sessions.filter((s) => sessionMatchesDate(s, date))
}

export type BranchOption = {
  id: string
  name: string
  order?: number
  color?: string | null
}

/** Item with location info (Session or DoctorSession). */
type WithLocation = { locationId?: string | null; location?: { id?: string; name: string } | null }

/** Unique locations (branches) from sessions; options update when sessions/date change. */
export function getBranchOptionsFromSessions(sessions: WithLocation[]): BranchOption[] {
  const seen = new Set<string>()
  const options: BranchOption[] = []
  for (const s of sessions) {
    const loc = s.location
    const id = s.locationId ?? loc?.id
    const name = loc?.name ?? "Unknown"
    if (id && !seen.has(id)) {
      seen.add(id)
      options.push({ id, name })
    }
  }
  return options
}
