"use server"

import prisma from "@/lib/prisma"
import { requirePermission } from "@/lib/server-permissions"

export type RoomOption = {
  id: string
  number: string
  occupied: boolean
  occupiedBySessionId: string | null
}

export async function getRoomsForArrival(
  locationId: string
): Promise<{ success: boolean; data?: RoomOption[]; message?: string }> {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return { success: false, message: "Permission denied." }
  }
  if (!locationId) return { success: true, data: [] }
  try {
    const roomModel = (prisma as unknown as { room: { findMany: (args: object) => Promise<Array<{ id: string; number: string; currentOccupiedSessionId?: string | null }>> } }).room
    const rooms = await roomModel.findMany({
      where: { status: 1, locationId },
      orderBy: { number: "asc" },
      select: { id: true, number: true, currentOccupiedSessionId: true },
    })
    return {
      success: true,
      data: rooms.map((r) => ({
        id: r.id,
        number: r.number,
        occupied: Boolean(r.currentOccupiedSessionId),
        occupiedBySessionId: r.currentOccupiedSessionId ?? null,
      })),
    }
  } catch (e) {
    console.error("getRoomsForArrival error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to load rooms.",
    }
  }
}
