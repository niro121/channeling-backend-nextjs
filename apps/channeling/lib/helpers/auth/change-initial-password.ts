import * as argon2 from "argon2"
import prisma from "@/lib/prisma"
import { MIN_PASSWORD_LENGTH, PASSWORD_REGEX } from "@/lib/validations/password"

export type ChangeInitialPasswordInput = {
  identifier: string
  currentPassword: string
  newPassword: string
  confirmPassword?: string
  /** When set, only users with this userType may change password (e.g. doctor app = 3). */
  userType?: number
}

export type ChangeInitialPasswordResult =
  | { success: true }
  | { success: false; status: number; error: string }

/**
 * First-login password change: verify admin-set password, set new password, clear mustChangePassword.
 */
export async function changeInitialPassword(
  input: ChangeInitialPasswordInput
): Promise<ChangeInitialPasswordResult> {
  const identifier = input.identifier.trim()
  const currentPassword = input.currentPassword
  const newPassword = input.newPassword.trim()
  const confirmPassword =
    typeof input.confirmPassword === "string"
      ? input.confirmPassword.trim()
      : undefined

  if (!identifier || !currentPassword || !newPassword) {
    return {
      success: false,
      status: 400,
      error: "Email/username, current password, and new password are required",
    }
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
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
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    }
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    return {
      success: false,
      status: 400,
      error:
        "Password must include uppercase, lowercase, number, and special character, with no spaces",
    }
  }

  if (currentPassword === newPassword) {
    return {
      success: false,
      status: 400,
      error: "New password must be different from the current password",
    }
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
      status: 1,
      ...(input.userType !== undefined ? { userType: input.userType } : {}),
    },
  })

  if (!user || !user.password) {
    return { success: false, status: 401, error: "Invalid credentials" }
  }

  if (user.mustChangePassword !== true) {
    return {
      success: false,
      status: 400,
      error: "This account does not require a password change",
    }
  }

  const isCorrect = await argon2.verify(user.password, currentPassword)
  if (!isCorrect) {
    return {
      success: false,
      status: 400,
      error: "Current password is incorrect",
    }
  }

  const hashedPassword = await argon2.hash(newPassword)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, mustChangePassword: false },
  })

  return { success: true }
}
