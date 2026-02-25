import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { userTypes } from "@/lib/roles"
import { getIO } from "@/lib/socket-server"

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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userType = (session.user as { userType?: number }).userType
    if (userType !== userTypes.admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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
    }

    return NextResponse.json(payload)
  } catch (e) {
    console.error("GET /api/admin/monitor error:", e)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
