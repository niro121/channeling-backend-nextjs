import { NextResponse } from "next/server"
import { routeDenied } from "@/lib/api-privilege"
import { getIO } from "@/lib/socket-server"
import prisma from "@/lib/prisma"
import { listRecentSystemAlerts } from "@/services/system-alert.service"

/** Thresholds for status (adjust as needed for your server size). */
const SOCKET_WARNING = 200
const SOCKET_DANGER = 500
const MEMORY_RSS_WARNING_MB = 600
const MEMORY_RSS_DANGER_MB = 1024
const HEAP_USED_WARNING_MB = 400
const HEAP_USED_DANGER_MB = 800

type Status = "ok" | "warning" | "danger"

function toStatus(value: number, warning: number, danger: number): Status {
  if (value >= danger) return "danger"
  if (value >= warning) return "warning"
  return "ok"
}

export async function GET() {
  try {
    const denied = await routeDenied("/admin/monitor")
    if (denied) return denied

    const io = getIO()
    const socketCount = io?.engine?.clientsCount ?? 0
    const memory = process.memoryUsage()
    const rssMb = Math.round(memory.rss / 1024 / 1024)
    const heapUsedMb = Math.round(memory.heapUsed / 1024 / 1024)
    const heapTotalMb = Math.round(memory.heapTotal / 1024 / 1024)
    const uptimeSeconds = Math.floor(process.uptime())

    const socketStatus = toStatus(socketCount, SOCKET_WARNING, SOCKET_DANGER)
    const rssStatus = toStatus(rssMb, MEMORY_RSS_WARNING_MB, MEMORY_RSS_DANGER_MB)
    const heapStatus = toStatus(heapUsedMb, HEAP_USED_WARNING_MB, HEAP_USED_DANGER_MB)

    const [alerts, dpayCalls] = await Promise.all([
      listRecentSystemAlerts(15).catch(() => []),
      prisma.apiLog
        .findMany({
          where: {
            OR: [
              { endpoint: { contains: "/api/internal/shift-lines" } },
              { endpoint: { contains: "/api/public/shifts" } },
              { clientId: "channeling-to-dpay" },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            createdAt: true,
            method: true,
            endpoint: true,
            statusCode: true,
            errorStatus: true,
            durationMs: true,
            uuid: true,
            clientId: true,
            requestBody: true,
            responseBody: true,
          },
        })
        .catch(() => []),
    ])

    const payload = {
      socket: {
        connections: socketCount,
        status: socketStatus,
        socketAvailable: !!io,
      },
      memory: {
        rssMb,
        heapUsedMb,
        heapTotalMb,
        rssStatus,
        heapStatus,
      },
      uptimeSeconds,
      at: new Date().toISOString(),
      alerts: alerts.map((row) => ({
        id: row.id,
        source: row.source,
        kind: row.kind,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
      })),
      dpayCalls: dpayCalls.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        method: row.method,
        endpoint: row.endpoint,
        statusCode: row.statusCode,
        errorStatus: row.errorStatus,
        durationMs: row.durationMs,
        uuid: row.uuid,
        direction: row.clientId === "channeling-to-dpay" || row.endpoint.includes("/api/internal/shift-lines")
          ? "Channeling → DPAY"
          : "DPAY → Channeling",
        requestBody: row.requestBody,
        responseBody: row.responseBody,
      })),
    }

    return NextResponse.json(payload)
  } catch (e) {
    console.error("GET /api/admin/monitor error:", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
