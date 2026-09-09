import prisma from "@/lib/prisma"
import { DOCTOR_USER_TYPE } from "@/lib/doctor-app-auth"
import { resolveDoctorProfileForUser } from "@/lib/helpers/auth/doctor-login"
import { sriLankaMobileRegex, sriLankaPhoneRegex } from "@/lib/regex"
import { z } from "zod"

const updateDoctorProfileSchema = z.object({
  phone: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || sriLankaPhoneRegex.test(val), "Phone Number Ex: 07x xxxxxxx"),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .transform((val) => val?.trim().replace(/\s/g, "") ?? "")
    .refine((val) => sriLankaMobileRegex.test(val), "Mobile Number Ex: 07x xxxxxxx"),
  addressLine1: z.string().trim().max(255).nullable().optional(),
  addressLine2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  registrationNumber: z.string().trim().max(100).optional().nullable(),
  qualification: z.string().trim().max(255).optional().nullable(),
})

export type UpdateDoctorAppProfileInput = z.input<typeof updateDoctorProfileSchema>

export type UpdateDoctorAppProfileResult =
  | {
      success: true
      status: 200
      doctor: {
        id: string
        code: string
        title: string
        name: string
        phone: string | null
        mobile: string
        addressLine1: string | null
        addressLine2: string | null
        city: string | null
        registrationNumber: string | null
        qualification: string | null
      }
    }
  | {
      success: false
      status: 400 | 401 | 404 | 500
      error: string
      message?: string
      issues?: Record<string, string[]>
    }

export async function updateDoctorAppProfileForUser(
  userId: string,
  payload: UpdateDoctorAppProfileInput
): Promise<UpdateDoctorAppProfileResult> {
  const user = await prisma.user.findFirst({
    where: { id: userId, userType: DOCTOR_USER_TYPE, status: 1 },
    select: { id: true, username: true },
  })

  if (!user) {
    return { success: false, status: 401, error: "Unauthorized" }
  }

  const profile = await resolveDoctorProfileForUser(user)
  if (!profile) {
    return {
      success: false,
      status: 404,
      error: "not_linked",
      message:
        "No doctor profile linked to this user. Link an Account with doctorId or set username to the doctor code.",
    }
  }

  const parsed = updateDoctorProfileSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      success: false,
      status: 400,
      error: "invalid_request",
      issues: parsed.error.flatten().fieldErrors,
      message: "Validation failed",
    }
  }

  const data = parsed.data

  const normalizeNullable = (value: string | null | undefined) => {
    if (value == null) return null
    const v = value.trim()
    return v === "" ? null : v
  }

  try {
    const updated = await prisma.doctor.update({
      where: { id: profile.id },
      data: {
        phone: normalizeNullable(data.phone),
        mobile: data.mobile,
        addressLine1: normalizeNullable(data.addressLine1),
        addressLine2: normalizeNullable(data.addressLine2),
        city: normalizeNullable(data.city),
        registrationNumber: normalizeNullable(data.registrationNumber),
        ...(normalizeNullable(data.qualification) !== null
          ? { qualification: normalizeNullable(data.qualification)! }
          : {}),
      },
      select: {
        id: true,
        code: true,
        title: true,
        name: true,
        phone: true,
        mobile: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        registrationNumber: true,
        qualification: true,
      },
    })

    return {
      success: true,
      status: 200,
      doctor: {
        id: updated.id,
        code: updated.code,
        title: updated.title,
        name: updated.name,
        phone: updated.phone ?? null,
        mobile: updated.mobile ?? "",
        addressLine1: updated.addressLine1 ?? null,
        addressLine2: updated.addressLine2 ?? null,
        city: updated.city ?? null,
        registrationNumber: updated.registrationNumber ?? null,
        qualification: updated.qualification ?? null,
      },
    }
  } catch (e) {
    console.error("updateDoctorAppProfileForUser error", e)
    return {
      success: false,
      status: 500,
      error: "server_error",
      message: "Failed to update doctor profile",
    }
  }
}
