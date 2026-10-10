"use client"

import { useEffect, useRef } from "react"
import { io, type Socket } from "socket.io-client"

export type ChannelRoomSocketPayload = {
  kind: "attendance" | "sessions"
  sessionId: string
  channelCurrentPatientNumber?: number
  institution?: number
  locationId?: string | null
}

function sortedKey(nums: number[]): string {
  return [...nums].sort((a, b) => a - b).join(",")
}

function sortedLoc(ids: string[]): string {
  return [...ids].filter(Boolean).sort().join(",")
}

/**
 * Subscribes to Socket.IO rooms for channel room live updates (mirrors channel-booking pattern).
 */
export function useChannelRoomSocket(opts: {
  locationIds: string[]
  institutionIds: number[]
  enabled: boolean
  onEvent: (payload: ChannelRoomSocketPayload) => void
}): void {
  const { locationIds, institutionIds, enabled, onEvent } = opts
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const locKey = sortedLoc(locationIds)
  const instKey = sortedKey(institutionIds)

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return
    const locs = locKey ? locKey.split(",").filter(Boolean) : []
    const insts = instKey
      ? instKey
          .split(",")
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n))
      : []
    if (locs.length === 0 && insts.length === 0) return

    const socket: Socket = io(window.location.origin, {
      path: "/socket.io",
      addTrailingSlash: false,
    })

    const handler = (payload: ChannelRoomSocketPayload) => {
      onEventRef.current?.(payload)
    }

    const subscribe = () => {
      socket.emit("channel-room:subscribe", { locationIds: locs, institutionIds: insts })
      if (process.env.NODE_ENV !== "production") {
        console.log("[use-channel-room-socket] subscribed", { locs, insts })
      }
    }

    socket.on("channel-room-update", handler)
    if (socket.connected) subscribe()
    else socket.once("connect", subscribe)

    return () => {
      socket.emit("channel-room:unsubscribe")
      socket.off("channel-room-update", handler)
      socket.disconnect()
    }
  }, [enabled, locKey, instKey])
}
