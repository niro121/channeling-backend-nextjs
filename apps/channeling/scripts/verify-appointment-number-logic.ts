/**
 * Quick sanity checks for appointment number allocation (run: npx tsx scripts/verify-appointment-number-logic.ts).
 */
import assert from "node:assert/strict"
import { computeNextAutoAppointmentNumber, effectiveAppointmentSequenceLastValue } from "../services/channel-booking/helpers/appointment-number"

const blocked23 = new Set([2, 3])
const occupied1 = new Set([1])

let r = computeNextAutoAppointmentNumber({
  sequenceLastValue: null,
  startingPatientNumber: 1,
  maxPatientNumber: 10,
  blocked: blocked23,
  occupied: new Set(),
})
assert.equal(r.ok && r.value, 1, "first auto with blocks 2–3 should be 1")

r = computeNextAutoAppointmentNumber({
  sequenceLastValue: 1,
  startingPatientNumber: 1,
  maxPatientNumber: 10,
  blocked: blocked23,
  occupied: occupied1,
})
assert.equal(r.ok && r.value, 4, "second auto after 1 should skip 2–3 → 4")

r = computeNextAutoAppointmentNumber({
  sequenceLastValue: null,
  startingPatientNumber: 1,
  maxPatientNumber: 5,
  blocked: new Set([3, 4]),
  occupied: new Set([1, 2, 5]),
})
assert.equal(r.ok, false, "no slot left when 1,2,5 taken and 3–4 blocked in 1..5")

assert.equal(effectiveAppointmentSequenceLastValue(null, 1), 0)
assert.equal(effectiveAppointmentSequenceLastValue(5, 1), 5)

console.log("verify-appointment-number-logic: OK")
