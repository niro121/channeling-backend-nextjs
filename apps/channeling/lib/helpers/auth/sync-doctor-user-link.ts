import prisma from "@/lib/prisma"
import { getOrCreateAccount } from "@/services/accounting/account/get-or-create.service"

/**
 * Links a doctor-app user to Doctor master data via Account (userId + doctorId).
 * Clears the link when doctorId is null.
 */
export async function syncDoctorUserAccountLink(
  userId: string,
  doctorId: string | null
): Promise<void> {
  await prisma.account.updateMany({
    where: { userId, doctorId: { not: null } },
    data: { userId: null },
  })

  const trimmed = doctorId?.trim()
  if (!trimmed) return

  const doctor = await prisma.doctor.findFirst({
    where: { id: trimmed, status: 1 },
    select: { id: true, code: true },
  })
  if (!doctor) {
    throw new Error("Selected doctor not found or is not published.")
  }

  const accountResult = await getOrCreateAccount({
    type: "PAYABLE",
    doctorId: doctor.id,
  })
  if (!accountResult.success) {
    throw new Error(accountResult.error)
  }

  await prisma.account.update({
    where: { id: accountResult.account.id },
    data: { userId },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { staffId: null },
  })
}

/** Active account doctorId for a user, if any. */
export async function getLinkedDoctorIdForUser(
  userId: string
): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      doctorId: { not: null },
      isActive: true,
    },
    select: { doctorId: true },
  })
  return account?.doctorId ?? null
}
