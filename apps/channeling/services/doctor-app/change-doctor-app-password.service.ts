import * as argon2 from "argon2"
import prisma from "@/lib/prisma"
import { DOCTOR_USER_TYPE } from "@/lib/doctor-app-auth"
const MIN_PASSWORD_LENGTH = 8
const PASSWORD_REGEX = /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/

export type ChangeDoctorAppPasswordInput = {
  currentPassword: string
  newPassword: string
  confirmPassword?: string
}

export type ChangeDoctorAppPasswordResult =
  | { success: true; status: 200; message: string }
  | {
      success: false
      status: 400 | 401 | 500
      error: string
    }

export async function changeDoctorAppPasswordForUser(
  userId: string,
  input: ChangeDoctorAppPasswordInput
): Promise<ChangeDoctorAppPasswordResult> {
  const currentPassword = input.currentPassword?.trim() ?? ""
  const newPassword = input.newPassword?.trim() ?? ""
  const confirmPassword =
    typeof input.confirmPassword === "string"
      ? input.confirmPassword.trim()
      : undefined

  if (!currentPassword || !newPassword) {
    return {
      success: false,
      status: 400,
      error: "currentPassword and newPassword are required",
    }
  }

  if (confirmPassword !== undefined && confirmPassword !== newPassword) {
    return {
      success: false,
      status: 400,
      error: "New password and confirmation do not match",
    }
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      status: 400,
      error: "Password must be at least 8 characters long",
    }
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    return {
      success: false,
      status: 400,
      error:
        "Password must only contain a mix of uppercase and lowercase letters, numbers, and special characters",
    }
  }

  if (currentPassword === newPassword) {
    return {
      success: false,
      status: 400,
      error: "New password must be different from current password",
    }
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, userType: DOCTOR_USER_TYPE, status: 1 },
    select: { id: true, password: true },
  })

  if (!user || !user.password) {
    return { success: false, status: 401, error: "Unauthorized" }
  }

  const isCorrect = await argon2.verify(user.password, currentPassword)
  if (!isCorrect) {
    return { success: false, status: 400, error: "Current password is incorrect" }
  }

  try {
    const hashedPassword = await argon2.hash(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    })
    return {
      success: true,
      status: 200,
      message: "Password changed successfully",
    }
  } catch (e) {
    console.error("changeDoctorAppPasswordForUser error", e)
    return {
      success: false,
      status: 500,
      error: "Failed to change password",
    }
  }
}
