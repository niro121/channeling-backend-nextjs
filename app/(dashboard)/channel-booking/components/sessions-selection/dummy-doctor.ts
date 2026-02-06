import type { Doctor } from "@/types/doctor"
import type { DoctorSession } from "@/types/doctor.session"
import type { Location } from "@/types/location"
import type { Room } from "@/types/room"
import type { Session } from "@/types/sessions"

/** Dummy doctor used when none is selected so date/branch selection still functions. */
export const DUMMY_DOCTOR: Doctor = {
  id: "dummy-doctor-id",
  title: "Dr",
  name: "Select a consultant",
  code: "DUMMY",
  order: 0,
  phone: null,
  mobile: "",
  fax: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  registrationNumber: "",
  qualification: "",
  referralCharge: 0,
  sessionNoPrefix: null,
  status: 1,
  specialityId: "",
}

const LOC_MAIN: Location = {
  id: "loc-main",
  name: "Hospital Main",
  code: "MAIN",
  addressLine1: "",
  addressLine2: "",
  city: "",
  branchType: 0,
  status: 1,
}

const LOC_A: Location = {
  id: "loc-a",
  name: "Hospital A",
  code: "A",
  addressLine1: "",
  addressLine2: "",
  city: "",
  branchType: 0,
  status: 1,
}

const LOC_B: Location = {
  id: "loc-b",
  name: "Hospital B",
  code: "B",
  addressLine1: "",
  addressLine2: "",
  city: "",
  branchType: 0,
  status: 1,
}

const today = new Date()
const toTime = (dayType: number) => {
  const d = new Date(today)
  const jsDay = dayType === 7 ? 0 : dayType
  const diff = jsDay - d.getDay()
  d.setDate(d.getDate() + (diff <= 0 ? diff + 7 : diff))
  return d
}

/** One session per weekday so branch options update by selected date; varied locations. */
function buildDummySession(
  id: string,
  name: string,
  dayType: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  location: Location
): DoctorSession {
  const start = toTime(dayType)
  return {
    id,
    name,
    institution: 1,
    startTime: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 9, 0),
    endTime: new Date(start.getFullYear(), start.getMonth(), start.getDate(), 17, 0),
    startingPatientNumber: 1,
    maxPatientNumber: 30,
    refundable: 1,
    advancedBookingDays: 30,
    fees: [],
    applyTo: undefined,
    dayType,
    status: 1,
    doctorId: DUMMY_DOCTOR.id,
    locationId: location.id,
    location,
  }
}

/** Dummy sessions for dummy doctor: one per weekday with different branches so branch options update by date. */
export const DUMMY_SESSIONS: DoctorSession[] = [
  buildDummySession("dummy-s1", "Sunday Session", 1, LOC_MAIN),
  buildDummySession("dummy-s2", "Monday Session", 2, LOC_MAIN),
  buildDummySession("dummy-s3", "Tuesday Session", 3, LOC_A),
  buildDummySession("dummy-s4", "Wednesday Session", 4, LOC_A),
  buildDummySession("dummy-s5", "Thursday Session", 5, LOC_B),
  buildDummySession("dummy-s6", "Friday Session", 6, LOC_B),
  buildDummySession("dummy-s7", "Saturday Session", 7, LOC_MAIN),
]

const ROOM_MAIN: Room = {
  id: "room-main",
  number: "101",
  description: "",
  status: 1,
  locationId: LOC_MAIN.id!,
  zoneId: 'default zone'
}

/** Day of week as DoctorSession.dayType: 1=Sun, ..., 7=Sat */
function getDayType(date: Date): number {
  const jsDay = date.getDay()
  return jsDay === 0 ? 7 : jsDay
}

/** Build Session[] for a given date from DUMMY_SESSIONS (for dummy doctor). */
export function buildDummySessionsForDate(date: Date): Session[] {
  const dayType = getDayType(date)
  const matching = DUMMY_SESSIONS.filter((s) => s.dayType === dayType)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return matching.map((ds) => {
    const startM = ds.startTime instanceof Date ? ds.startTime.getHours() * 60 + ds.startTime.getMinutes() : 540
    const endM = ds.endTime instanceof Date ? ds.endTime.getHours() * 60 + ds.endTime.getMinutes() : 1020
    const loc = ds.location!
    const room: Room = { ...ROOM_MAIN, id: `room-${loc.id}`, locationId: loc.id! }
    return {
      id: `dummy-session-${ds.id}-${d.toISOString().slice(0, 10)}`,
      institution: ds.institution,
      date: new Date(d),
      doctorSessionId: ds.id ?? "",
      previousDoctorSession: null,
      startTime: startM,
      endTime: endM,
      durationMinutes: ds.durationMinutes ?? null,
      startingPatientNumber: ds.startingPatientNumber,
      maxPatientNumber: ds.maxPatientNumber,
      refundable: ds.refundable,
      fees: ds.fees ?? {},
      amountLocal: ds.amountLocal ?? null,
      amountForeign: ds.amountForeign ?? null,
      status: 1,
      remarks: null,
      appointmentNo: 0,
      isScan: false,
      doctorId: DUMMY_DOCTOR.id ?? null,
      departmentId: null,
      locationId: loc.id ?? null,
      roomId: room.id ?? null,
      location: loc,
      room,
      doctor: DUMMY_DOCTOR,
    } as Session
  })
}
