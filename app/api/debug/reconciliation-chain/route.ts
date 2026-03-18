import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { normalizedIncludedIds } from "@/lib/handover-utils"
import {
  getIncludedHandoversChain,
  getFullChainByForwardedTo,
  type IncludedHandoverForDisplay,
} from "@/services/shift-handover.service"

/** Debug: inspect chain for a reconciliation handover. GET ?handoverId=xxx */
export async function GET(req: NextRequest) {
  const handoverId = req.nextUrl.searchParams.get("handoverId")
  if (!handoverId) {
    return NextResponse.json({ error: "Missing handoverId" }, { status: 400 })
  }

  const top = await prisma.shiftHandover.findUnique({
    where: { id: handoverId },
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      status: true,
      forwardedToHandoverId: true,
      includedHandoverIds: true,
      createdAt: true,
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  })
  if (!top) {
    return NextResponse.json({ error: "Handover not found", handoverId }, { status: 404 })
  }

  const byForwarded = await prisma.shiftHandover.findMany({
    where: { forwardedToHandoverId: handoverId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      createdAt: true,
      fromUser: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
  })

  const idsFromIncluded = normalizedIncludedIds(top.includedHandoverIds)
  const chainFromIds = await getIncludedHandoversChain(top.includedHandoverIds)
  const chainFromForwarded = await getFullChainByForwardedTo(handoverId)

  return NextResponse.json({
    handoverId,
    top: {
      id: top.id,
      from: top.fromUser?.name ?? top.fromUserId,
      to: top.toUser?.name ?? top.toUserId,
      status: top.status,
      forwardedToHandoverId: top.forwardedToHandoverId,
      includedHandoverIdsRaw: top.includedHandoverIds,
      includedHandoverIdsType: typeof top.includedHandoverIds,
      includedHandoverIdsIsArray: Array.isArray(top.includedHandoverIds),
      normalizedIds: idsFromIncluded,
      createdAt: top.createdAt,
    },
    handoversWithForwardedToThisId: byForwarded.map((h) => ({
      id: h.id,
      from: h.fromUser?.name ?? h.fromUserId,
      to: h.toUser?.name ?? h.toUserId,
      createdAt: h.createdAt,
    })),
    getIncludedHandoversChainCount: chainFromIds.length,
    getIncludedHandoversChainIds: chainFromIds.map((h: IncludedHandoverForDisplay) => h.id),
    getFullChainByForwardedToCount: chainFromForwarded.length,
    getFullChainByForwardedToIds: chainFromForwarded.map((h: IncludedHandoverForDisplay) => h.id),
  })
}
