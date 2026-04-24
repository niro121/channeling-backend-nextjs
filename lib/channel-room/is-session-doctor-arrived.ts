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
