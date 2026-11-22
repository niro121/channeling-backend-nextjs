import prisma from "@/lib/prisma"

const DEDUPE_MS = 5 * 60 * 1000

export async function recordDpayAlert(kind: string, message: string): Promise<void> {
  try {
    const since = new Date(Date.now() - DEDUPE_MS)
    const open = await prisma.systemAlert.findFirst({
      where: { source: "dpay", kind, resolvedAt: null, createdAt: { gte: since } },
      select: { id: true },
    })
    if (open) return
    await prisma.systemAlert.create({
      data: { source: "dpay", kind, message },
    })
  } catch (error) {
    console.error("[SystemAlert] Failed to record DPAY alert:", error)
  }
}

export async function resolveDpayAlerts(): Promise<void> {
  try {
    await prisma.systemAlert.updateMany({
      where: { source: "dpay", resolvedAt: null },
      data: { resolvedAt: new Date() },
    })
  } catch (error) {
    console.error("[SystemAlert] Failed to resolve DPAY alerts:", error)
  }
}

export async function listRecentSystemAlerts(limit = 15) {
  return prisma.systemAlert.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      source: true,
      kind: true,
      message: true,
      createdAt: true,
      resolvedAt: true,
    },
  })
}
