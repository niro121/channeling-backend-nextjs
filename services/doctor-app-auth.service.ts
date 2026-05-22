import * as argon2 from "argon2"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { DOCTOR_USER_TYPE, issueDoctorAppToken } from "@/lib/doctor-app-auth"
import {
  findActiveDoctorUser,
  getDoctorTwoFactorPolicy,
  resolveDoctorProfileForUser,
  toDoctorAppUserPayload,
  type DoctorProfileSummary,
  type DoctorUserWithGroup,
} from "@/lib/helpers/auth/doctor-login"
import {
  TWO_FACTOR_METHODS,
  TWO_FA_CODE_EXPIRY_MINUTES,
  TWO_FA_PENDING_EXPIRY_MINUTES,
} from "@/lib/helpers/2fa/constants"
import {
  generateSixDigitCode,
  generateTotpSecret,
  generateTotpURI,
  verifyTotp,
} from "@/lib/helpers/2fa/totp"
import { send2faSms, send2faEmail } from "@/lib/helpers/2fa/send-2fa-code"

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Ruhunu Channelling"

export type DoctorAppLoginResult =
  | {
      success: true
      accessToken: string
      expiresIn: number
      tokenType: "Bearer"
      user: ReturnType<typeof toDoctorAppUserPayload>
      doctor: DoctorProfileSummary | null
    }
  | {
      success: false
      status: number
      error: string
      requiresTwoFactor?: boolean
      allowedMethods?: string[]
      requiresPasswordChange?: boolean
      twoFactorToken?: string
      needsSetup?: boolean
      uri?: string
      secret?: string
      message?: string
    }

async function verifyDoctorPassword(
  user: DoctorUserWithGroup,
  password: string
): Promise<boolean> {
  if (!user.password) return false
  return argon2.verify(user.password, password)
}

export type DoctorAppCheckLoginResult =
  | { success: true; requiresTwoFactor: false }
  | {
      success: true
      requiresTwoFactor: true
      allowedMethods: string[]
    }
  | {
      success: false
      status: number
      error: string
      requiresPasswordChange?: boolean
    }

export async function doctorAppCheckLogin(
  identifier: string,
  password: string
): Promise<DoctorAppCheckLoginResult> {
  const user = await findActiveDoctorUser(identifier)
  if (!user || !user.password) {
    return { success: false, status: 401, error: "Invalid credentials" }
  }

  const valid = await verifyDoctorPassword(user, password)
  if (!valid) {
    return { success: false, status: 401, error: "Invalid credentials" }
  }

  if (user.mustChangePassword === true) {
    return {
      success: false,
      status: 403,
      error: "Password change required",
      requiresPasswordChange: true,
    }
  }

  const { userRequires2FA, allowedMethods } = getDoctorTwoFactorPolicy(user)

  if (!userRequires2FA) {
    return { success: true, requiresTwoFactor: false }
  }

  return {
    success: true,
    requiresTwoFactor: true,
    allowedMethods,
  }
}

export type DoctorAppRequest2faResult =
  | {
      success: true
      twoFactorToken?: string
      needsSetup?: boolean
      uri?: string
      secret?: string
      message: string
    }
  | { success: false; status: number; error: string }

export async function doctorAppRequest2faCode(
  identifier: string,
  password: string,
  method: string
): Promise<DoctorAppRequest2faResult> {
  const validMethods = [
    TWO_FACTOR_METHODS.AUTH_APP,
    TWO_FACTOR_METHODS.SMS,
    TWO_FACTOR_METHODS.EMAIL,
  ]
  if (!validMethods.includes(method as (typeof validMethods)[number])) {
    return {
      success: false,
      status: 400,
      error: "Method must be 1 (authenticator), 2 (SMS), or 3 (email)",
    }
  }

  const user = await findActiveDoctorUser(identifier)
  if (!user || !user.password) {
    return { success: false, status: 401, error: "Invalid credentials" }
  }

  const valid = await verifyDoctorPassword(user, password)
  if (!valid) {
    return { success: false, status: 401, error: "Invalid credentials" }
  }

  if (user.twoFactorEnabled !== true) {
    return {
      success: false,
      status: 403,
      error: "2FA not enabled for this account",
    }
  }

  const { groupAllows2FA, allowedMethods } = getDoctorTwoFactorPolicy(user)
  if (!groupAllows2FA) {
    return {
      success: false,
      status: 403,
      error: "2FA is disabled for your group by your administrator.",
    }
  }
  if (!allowedMethods.includes(method)) {
    return { success: false, status: 403, error: "Method not allowed" }
  }

  const expiresMinutes =
    method === TWO_FACTOR_METHODS.AUTH_APP
      ? TWO_FA_PENDING_EXPIRY_MINUTES
      : TWO_FA_CODE_EXPIRY_MINUTES
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000)

  if (method === TWO_FACTOR_METHODS.AUTH_APP) {
    const token = crypto.randomBytes(24).toString("hex")
    const hasExistingSecret = Boolean(user.twoFactorSecret)

    if (!hasExistingSecret) {
      const secret = generateTotpSecret()
      const uri = generateTotpURI({
        secret,
        label: user.email,
        issuer: APP_NAME,
      })
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorMethod: TWO_FACTOR_METHODS.AUTH_APP,
          twoFactorPendingSecret: secret,
          twoFactorTempCode: token,
          twoFactorExpires: expiresAt,
        },
      })
      return {
        success: true,
        twoFactorToken: token,
        needsSetup: true,
        uri,
        secret,
        message:
          "Set up your authenticator app, then enter the 6-digit code to complete login",
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempCode: token,
        twoFactorExpires: expiresAt,
        twoFactorPendingSecret: null,
      },
    })
    return {
      success: true,
      twoFactorToken: token,
      message: "Enter the 6-digit code from your authenticator app",
    }
  }

  if (method === TWO_FACTOR_METHODS.SMS) {
    const phone = user.phone?.trim()
    if (!phone) {
      return {
        success: false,
        status: 400,
        error:
          "Phone number not set. Please ask your administrator to add your mobile number.",
      }
    }
    const code = generateSixDigitCode()
    const smsResult = await send2faSms(phone, code)
    if (!smsResult.success) {
      return {
        success: false,
        status: 503,
        error: "Failed to send SMS. Please try again or use another method.",
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempCode: code,
        twoFactorExpires: expiresAt,
        twoFactorPendingSecret: null,
      },
    })
    return {
      success: true,
      message: "A verification code has been sent to your phone",
    }
  }

  if (method === TWO_FACTOR_METHODS.EMAIL) {
    const code = generateSixDigitCode()
    const emailResult = await send2faEmail(user.email, code)
    if (!emailResult.success) {
      return {
        success: false,
        status: 503,
        error:
          "Email verification is currently unavailable. Please use another method.",
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempCode: code,
        twoFactorExpires: expiresAt,
        twoFactorPendingSecret: null,
      },
    })
    return {
      success: true,
      message: "A verification code has been sent to your email",
    }
  }

  return { success: false, status: 400, error: "Invalid method" }
}

async function completeDoctorAppLogin(
  user: DoctorUserWithGroup
): Promise<DoctorAppLoginResult> {
  const { accessToken, expiresIn } = await issueDoctorAppToken(user.id)
  const doctor = await resolveDoctorProfileForUser(user)
  return {
    success: true,
    accessToken,
    expiresIn,
    tokenType: "Bearer",
    user: toDoctorAppUserPayload(user),
    doctor,
  }
}

async function verifyDoctor2faCode(
  user: DoctorUserWithGroup,
  password: string,
  twoFactorCode: string,
  twoFactorToken: string | null
): Promise<DoctorAppLoginResult> {
  const code = twoFactorCode.trim()
  if (!code) {
    return { success: false, status: 400, error: "2FA code is required" }
  }

  const isAuthAppToken =
    typeof twoFactorToken === "string" &&
    twoFactorToken.length > 10 &&
    !/^\d{6}$/.test(twoFactorToken)

  if (isAuthAppToken) {
    const pendingUser = await prisma.user.findFirst({
      where: {
        id: user.id,
        twoFactorTempCode: twoFactorToken,
        twoFactorExpires: { gt: new Date() },
        status: 1,
        userType: user.userType,
      },
      include: { userGroup: true },
    })
    if (!pendingUser) {
      return {
        success: false,
        status: 401,
        error: "Invalid or expired 2FA. Please try again.",
      }
    }
    const totpSecret =
      pendingUser.twoFactorSecret ??
      pendingUser.twoFactorPendingSecret ??
      process.env.TOTP_SECRET
    if (!totpSecret) {
      return {
        success: false,
        status: 401,
        error: "Invalid or expired 2FA. Please try again.",
      }
    }
    const validTotp = await verifyTotp(code, totpSecret)
    if (!validTotp) {
      return { success: false, status: 401, error: "Invalid 2FA code." }
    }
    const usedPendingSecret = Boolean(pendingUser.twoFactorPendingSecret)
    await prisma.user.update({
      where: { id: pendingUser.id },
      data: {
        twoFactorTempCode: null,
        twoFactorExpires: null,
        ...(usedPendingSecret
          ? {
              twoFactorSecret: pendingUser.twoFactorPendingSecret,
              twoFactorPendingSecret: null,
            }
          : {}),
      },
    })
    return completeDoctorAppLogin(pendingUser)
  }

  const validPassword = await verifyDoctorPassword(user, password)
  if (!validPassword) {
    return { success: false, status: 401, error: "Invalid credentials" }
  }
  if (!user.twoFactorExpires || user.twoFactorExpires < new Date()) {
    return {
      success: false,
      status: 401,
      error: "2FA code expired. Please log in again.",
    }
  }
  const storedCode =
    user.twoFactorTempCode != null ? String(user.twoFactorTempCode) : ""
  if (storedCode !== code) {
    return { success: false, status: 401, error: "Invalid 2FA code." }
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorTempCode: null, twoFactorExpires: null },
  })
  return completeDoctorAppLogin(user)
}

export async function doctorAppLogin(
  identifier: string,
  password: string,
  twoFactorCode?: string,
  twoFactorToken?: string | null
): Promise<DoctorAppLoginResult> {
  const user = await findActiveDoctorUser(identifier)
  if (!user || !user.password) {
    return { success: false, status: 401, error: "Invalid credentials" }
  }

  const valid = await verifyDoctorPassword(user, password)
  if (!valid) {
    return { success: false, status: 401, error: "Invalid credentials" }
  }

  if (user.mustChangePassword === true) {
    return {
      success: false,
      status: 403,
      error: "Password change required",
      requiresPasswordChange: true,
    }
  }

  const { userRequires2FA, allowedMethods } = getDoctorTwoFactorPolicy(user)
  const has2faCode =
    typeof twoFactorCode === "string" && twoFactorCode.trim().length > 0

  if (userRequires2FA) {
    if (!has2faCode) {
      return {
        success: false,
        status: 403,
        error: "Two-factor authentication required",
        requiresTwoFactor: true,
        allowedMethods,
      }
    }
    return verifyDoctor2faCode(
      user,
      password,
      twoFactorCode!,
      twoFactorToken ?? null
    )
  }

  if (has2faCode) {
    return {
      success: false,
      status: 400,
      error: "Two-factor authentication is not enabled for this account",
    }
  }

  return completeDoctorAppLogin(user)
}

export async function doctorAppGetSession(userId: string): Promise<{
  success: boolean
  status: number
  error?: string
  user?: ReturnType<typeof toDoctorAppUserPayload>
  doctor?: DoctorProfileSummary | null
}> {
  const user = await prisma.user.findFirst({
    where: { id: userId, userType: DOCTOR_USER_TYPE, status: 1 },
    include: { userGroup: true },
  })
  if (!user) {
    return { success: false, status: 401, error: "Unauthorized" }
  }
  const doctor = await resolveDoctorProfileForUser(user)
  return {
    success: true,
    status: 200,
    user: toDoctorAppUserPayload(user),
    doctor,
  }
}
