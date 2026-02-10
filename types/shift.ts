export const SHIFT_STATUS = {
  PAUSED: 0,
  ACTIVE: 1,
  ENDED: 3,
} as const

export type ShiftStatus = (typeof SHIFT_STATUS)[keyof typeof SHIFT_STATUS]

export type Shift = {
  id: string
  userId: string
  startedAt: Date
  endsAt: Date
  status: ShiftStatus
  createdAt: Date
  createdBy?: string | null
  pausedAt?: Date | null
  pausedBy?: string | null
  endedAt?: Date | null
  endedBy?: string | null
  updatedAt: Date
}
