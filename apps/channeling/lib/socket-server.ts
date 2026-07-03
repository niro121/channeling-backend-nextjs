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

/** Room name for float-request updates: per requested-by user (cashier gets notified when approved/rejected). */
export function floatRequestRoom(requestedById: string): string {
  return `float-request:${requestedById}`
}

/** Room name for float balance updates: per user (cashier gets notified when their ledger balance changes). */
export function floatBalanceRoom(userId: string): string {
  return `float-balance:${userId}`
}

/** Room name for shift status updates: per user (so all their tabs refresh when shift is handed over, approved, etc.). */
export function shiftUpdateRoom(userId: string): string {
  return `shift:${userId}`
}

const CHANNEL_ROOM_PREFIX = "channel-room:"

/** Socket room for channel-room dashboard live updates (per location). */
export function channelRoomLocationRoom(locationId: string): string {
  return `${CHANNEL_ROOM_PREFIX}location:${locationId}`
}

/** Fallback when session has no location: broadcast by institution id (int as string). */
export function channelRoomInstitutionRoom(institution: number): string {
  return `${CHANNEL_ROOM_PREFIX}institution:${institution}`
}

export function channelRoomSocketRooms(session: {
  locationId: string | null
  institution: number
}): string[] {
  const rooms: string[] = []
  if (session.locationId?.trim()) {
    rooms.push(channelRoomLocationRoom(session.locationId.trim()))
  }
  rooms.push(channelRoomInstitutionRoom(session.institution))
  return rooms
}
