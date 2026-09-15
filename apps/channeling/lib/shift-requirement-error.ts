export type ShiftRequirementErrorCode =
  | "NO_ACTIVE_SHIFT"
  | "SHIFT_PAUSED"
  | "HANDOVER_NOT_COMPLETE"
  | "SHIFT_EXPIRED"

/** Thrown when a till action requires an ACTIVE shift but the user cannot proceed. */
export class ShiftRequirementError extends Error {
  readonly code: ShiftRequirementErrorCode

  constructor(message: string, code: ShiftRequirementErrorCode) {
    super(message)
    this.name = "ShiftRequirementError"
    this.code = code
  }
}

export function isShiftRequirementError(e: unknown): e is ShiftRequirementError {
  if (e instanceof ShiftRequirementError) return true
  if (!e || typeof e !== "object") return false
  const err = e as { name?: unknown; code?: unknown; message?: unknown }
  return (
    err.name === "ShiftRequirementError" &&
    typeof err.code === "string" &&
    typeof err.message === "string"
  )
}
