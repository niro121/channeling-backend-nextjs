import type { ArrivalDepartureEntry } from "@/services/channel-booking/get-session-arrival-state.service"

function parseArrivalDepartureJson(json: unknown): ArrivalDepartureEntry[] {
  if (!Array.isArray(json)) return []
  return json.filter(
    (item): item is ArrivalDepartureEntry =>
      item != null &&
      typeof item === "object" &&
      "time" in item &&
      "createdBy" in item &&
      typeof (item as ArrivalDepartureEntry).time === "string" &&
      typeof (item as ArrivalDepartureEntry).createdBy === "string"
  )
}

export function isSessionDoctorArrived(session: {
  doctorArrivalTime?: unknown
  doctorDepatureTime?: unknown
}): boolean {
  const arrivals = parseArrivalDepartureJson(session.doctorArrivalTime)
  const departures = parseArrivalDepartureJson(session.doctorDepatureTime)
  return arrivals.length > departures.length
}

/**
 * True when the doctor has departed and has not arrived again after the last departure.
 * Same rule as settlement: no departures → not departed; otherwise require an arrival after last departure.
 */
export function isSessionDoctorDeparted(session: {
  doctorArrivalTime?: unknown
  doctorDepatureTime?: unknown
} | null | undefined): boolean {
  if (!session) return false
  const arrivals = parseArrivalDepartureJson(session.doctorArrivalTime)
  const departures = parseArrivalDepartureJson(session.doctorDepatureTime)
  if (departures.length === 0) return false
  const lastDepTime = Math.max(...departures.map((e) => parseInt(e.time, 10) || 0))
  const hasArrivalAfterLastDep = arrivals.some((e) => (parseInt(e.time, 10) || 0) > lastDepTime)
  return !hasArrivalAfterLastDep
}
