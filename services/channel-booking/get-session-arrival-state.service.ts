"use server"

import prisma from "@/lib/prisma"

export type ArrivalDepartureEntry = { time: string; createdBy: string }

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

export type SessionArrivalState = {
  doctorArrivalTime: ArrivalDepartureEntry[]
  doctorDepatureTime: ArrivalDepartureEntry[]
  roomId: string | null
  locationId: string | null
}

export async function getSessionArrivalStateService(
  sessionId: string
): Promise<{ success: boolean; data?: SessionArrivalState; message?: string }> {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        doctorArrivalTime: true,
        doctorDepatureTime: true,
        roomId: true,
        locationId: true,
      },
    })
    if (!session) return { success: false, message: "Session not found." }
    return {
      success: true,
      data: {
        doctorArrivalTime: parseArrivalDepartureJson(session.doctorArrivalTime),
        doctorDepatureTime: parseArrivalDepartureJson(session.doctorDepatureTime),
        roomId: session.roomId ?? null,
        locationId: session.locationId ?? null,
      },
    }
  } catch (e) {
    console.error("getSessionArrivalStateService error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to load session state.",
    }
  }
}
