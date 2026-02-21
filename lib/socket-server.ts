/**
 * Socket.io server instance set by the custom server (server.js).
 * server.js sets global.__SOCKET_IO__ so both CJS and the Next app share the same instance.
 * When not using the custom server (e.g. next:dev), getIO() returns null and emissions are no-ops.
 */

import type { Server } from "socket.io"

declare global {
  var __SOCKET_IO__: Server | undefined
}

export function getIO(): Server | null {
  return typeof globalThis !== "undefined" ? globalThis.__SOCKET_IO__ ?? null : null
}

/** Room name for channel-booking session updates: per doctor (so list updates when date changes too). */
export function channelBookingRoom(doctorId: string): string {
  return `channel-booking:${doctorId}`
}
