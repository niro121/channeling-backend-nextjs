import prisma from "@/lib/prisma"
import { DOCTOR_USER_TYPE } from "@/lib/doctor-app-auth"
import type { User, UserGroup } from "@prisma/client"

export type DoctorUserWithGroup = User & { userGroup: UserGroup | null }

export async function findActiveDoctorUser(
  identifier: string
): Promise<DoctorUserWithGroup | null> {
  const trimmed = identifier.trim()
  if (!trimmed) return null
  return prisma.user.findFirst({
    where: {
      userType: DOCTOR_USER_TYPE,
      status: 1,
      OR: [{ email: trimmed }, { username: trimmed }],
    },
    include: { userGroup: true },
  })
}

export function getDoctorTwoFactorPolicy(user: DoctorUserWithGroup): {
  groupAllows2FA: boolean
  userRequires2FA: boolean
  allowedMethods: string[]
} {
  const group = user.userGroup
  const groupAllows2FA = group == null || group.twoFactorEnabled === true
  const userRequires2FA = user.twoFactorEnabled === true && groupAllows2FA
  const allowedMethods =
    Array.isArray(group?.twoFactorMethods) && group.twoFactorMethods.length > 0
      ? group.twoFactorMethods
      : ["1", "2", "3"]
  return { groupAllows2FA, userRequires2FA, allowedMethods }
}

export type DoctorProfileSummary = {
  id: string
  title: string
  name: string
  code: string
  mobile: string | null
  phone: string | null
  qualification: string
  registrationNumber: string | null
  speciality: { id: string; name: string; code: string } | null
}

/** Resolve Doctor record for a doctor-app user (account link, then username as doctor code). */
export async function resolveDoctorProfileForUser(
  user: Pick<User, "id" | "username">
): Promise<DoctorProfileSummary | null> {
  const account = await prisma.account.findFirst({
    where: {
      userId: user.id,
      doctorId: { not: null },
      isActive: true,
    },
    include: {
      doctor: {
        include: {
          speciality: { select: { id: true, name: true, code: true } },
        },
      },
    },
  })

  let doctor = account?.doctor ?? null

  if (!doctor && user.username?.trim()) {
    doctor = await prisma.doctor.findFirst({
      where: { code: user.username.trim(), status: 1 },
      include: {
        speciality: { select: { id: true, name: true, code: true } },
      },
    })
  }

  if (!doctor) return null

  return {
    id: doctor.id,
    title: doctor.title,
    name: doctor.name,
    code: doctor.code,
    mobile: doctor.mobile,
    phone: doctor.phone,
    qualification: doctor.qualification,
    registrationNumber: doctor.registrationNumber,
    speciality: doctor.speciality
      ? {
          id: doctor.speciality.id,
          name: doctor.speciality.name,
          code: doctor.speciality.code,
        }
      : null,
  }
}

export function toDoctorAppUserPayload(user: DoctorUserWithGroup) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    phone: user.phone,
    userType: user.userType,
  }
}
