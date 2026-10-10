import prisma from "@/lib/prisma"

/**
 * Spec §6.2. If session has previous_doctor_session, check that the previous session
 * (same date) is full (appointment_no >= max_patient_number). Return true only if previous is full.
 * If no previous session, return false (so caller will throw previousessionfill).
 */
export async function checkConsecutiveSessionFull(
  sessionId: string
): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { previousDoctorSession: true, date: true },
  })

  if (!session?.previousDoctorSession) {
    return false
  }

  const previousSession = await prisma.session.findFirst({
    where: {
      doctorSessionId: session.previousDoctorSession,
      date: session.date,
    },
    select: { appointmentNo: true, maxPatientNumber: true },
  })

  if (!previousSession) {
    return false
  }

  return previousSession.appointmentNo >= previousSession.maxPatientNumber
}
