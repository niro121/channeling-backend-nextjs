import prisma from "@/lib/prisma"
import { hasPermission } from "@/lib/permissions"
import { userTypes } from "@/lib/roles"
import type { Permissions } from "@/types/user-group"
import {
  APPROVAL_ACTION,
  APPROVAL_REQUEST_TYPE,
  BANK_DEPOSIT_SLIP_ALLOWED_CONTENT_TYPES,
  BANK_DEPOSIT_SLIP_MAX_BYTES,
  type BankDepositSnapshot,
} from "@/types/approval-request"
import {
  SHIFT_BILL_KIND_LABELS,
  isShiftBillKind,
} from "@/types/shift-bill-attachment"
import { getCurrentShift } from "@/services/shift.service"
import {
  bankDepositSlipKeyPrefixForUser,
  getBankDepositSlipObjectKey,
  getBillAttachmentBytes,
  getBillAttachmentThumbKey,
  headBillAttachmentObject,
  presignBillAttachmentPut,
  putBillAttachmentObject,
} from "@/lib/s3"
import sharp from "sharp"

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function depositSnapshot(raw: unknown): BankDepositSnapshot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return raw as BankDepositSnapshot
}

function isOwnedSlipKey(key: string, userId: string): boolean {
  const prefix = bankDepositSlipKeyPrefixForUser(userId)
  return key.startsWith(prefix) && !key.includes("..") && key.length < 240
}

export async function requestBankDepositSlipUpload(params: {
  userId: string
  contentType: string
  sizeBytes: number
}): Promise<
  | { success: true; slipKey: string; uploadUrl: string }
  | { success: false; error: string }
> {
  const contentType = params.contentType.trim().toLowerCase()
  if (!(BANK_DEPOSIT_SLIP_ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    return { success: false, error: "Only JPEG, PNG, or WebP images are allowed." }
  }
  if (!Number.isFinite(params.sizeBytes) || params.sizeBytes <= 0 || params.sizeBytes > BANK_DEPOSIT_SLIP_MAX_BYTES) {
    return { success: false, error: "Image must be 2 MB or smaller." }
  }

  const slipKey = getBankDepositSlipObjectKey(
    params.userId,
    crypto.randomUUID(),
    EXT_BY_CONTENT_TYPE[contentType] ?? "jpg"
  )

  try {
    const uploadUrl = await presignBillAttachmentPut(slipKey, contentType)
    return { success: true, slipKey, uploadUrl }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not prepare upload."
    return { success: false, error: message }
  }
}

async function copyShiftBillToBankDepositSlip(params: {
  userId: string
  attachmentId: string
}): Promise<
  | { success: true; slipImageKey: string; slipImageContentType: string; slipImageName: string }
  | { success: false; errorCode: string; message: string }
> {
  const shift = await getCurrentShift(params.userId)
  if (!shift) {
    return {
      success: false,
      errorCode: "shift_required",
      message: "An active shift is required to attach a photo from this shift.",
    }
  }

  const row = await prisma.shiftBillAttachment.findFirst({
    where: {
      id: params.attachmentId,
      shiftId: shift.id,
      uploadedAt: { not: null },
    },
  })
  if (!row) {
    return {
      success: false,
      errorCode: "VALIDATION",
      message: "That photo was not found on your current shift.",
    }
  }

  const exists = await headBillAttachmentObject(row.s3Key)
  if (!exists) {
    return {
      success: false,
      errorCode: "VALIDATION",
      message: "That shift photo could not be loaded. Try another photo or upload a new slip.",
    }
  }

  const contentType = row.contentType.trim().toLowerCase() || "image/jpeg"
  const ext = EXT_BY_CONTENT_TYPE[contentType] ?? "jpg"
  const destKey = getBankDepositSlipObjectKey(params.userId, crypto.randomUUID(), ext)

  try {
    const original = await getBillAttachmentBytes(row.s3Key)
    await putBillAttachmentObject(destKey, original.body, contentType)
  } catch {
    return {
      success: false,
      errorCode: "SERVER_ERROR",
      message: "Could not attach the shift photo. Try again.",
    }
  }

  const kindLabel = isShiftBillKind(row.kind) ? SHIFT_BILL_KIND_LABELS[row.kind] : "Bill"
  const note = row.note?.trim()
  const fileName = `${(note || kindLabel).slice(0, 80)}.${ext}`

  return {
    success: true,
    slipImageKey: destKey,
    slipImageContentType: contentType,
    slipImageName: fileName,
  }
}

export async function resolveBankDepositSlipSnapshot(params: {
  userId: string
  slipImageKey?: string | null
  slipImageContentType?: string | null
  slipImageName?: string | null
  shiftBillAttachmentId?: string | null
}): Promise<
  | { success: true; snapshot: Pick<BankDepositSnapshot, "slip_image_key" | "slip_image_thumb_key" | "slip_image_content_type" | "slip_image_name"> }
  | { success: false; errorCode: string; message: string }
> {
  const uploadedKey = params.slipImageKey?.trim()
  const shiftBillAttachmentId = params.shiftBillAttachmentId?.trim()
  if (uploadedKey && shiftBillAttachmentId) {
    return {
      success: false,
      errorCode: "VALIDATION",
      message: "Choose either a new deposit slip or a photo from this shift.",
    }
  }

  let key = uploadedKey
  let contentTypeArg = params.slipImageContentType
  let fileNameArg = params.slipImageName

  if (shiftBillAttachmentId) {
    const copied = await copyShiftBillToBankDepositSlip({
      userId: params.userId,
      attachmentId: shiftBillAttachmentId,
    })
    if (!copied.success) return copied
    key = copied.slipImageKey
    contentTypeArg = copied.slipImageContentType
    fileNameArg = copied.slipImageName
  }

  if (!key) {
    return { success: true, snapshot: {} }
  }
  if (!isOwnedSlipKey(key, params.userId)) {
    return { success: false, errorCode: "VALIDATION", message: "Deposit slip upload is invalid." }
  }

  const exists = await headBillAttachmentObject(key)
  if (!exists) {
    return {
      success: false,
      errorCode: "VALIDATION",
      message: "Deposit slip upload did not complete. Try again.",
    }
  }

  const contentType = contentTypeArg?.trim().toLowerCase() || "image/jpeg"
  const fileName = fileNameArg?.trim().slice(0, 120) || "deposit-slip.jpg"

  let thumbKey: string | undefined
  try {
    const original = await getBillAttachmentBytes(key)
    const thumbBytes = await sharp(original.body)
      .rotate()
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer()
    thumbKey = getBillAttachmentThumbKey(key)
    await putBillAttachmentObject(thumbKey, new Uint8Array(thumbBytes), "image/webp")
  } catch {
    thumbKey = undefined
  }

  return {
    success: true,
    snapshot: {
      slip_image_key: key,
      slip_image_thumb_key: thumbKey,
      slip_image_content_type: contentType,
      slip_image_name: fileName,
    },
  }
}

export async function getBankDepositSlipForView(params: {
  requestId: string
  userId: string
  userType: number
  permissions: Permissions | null | undefined
  size?: "full" | "thumb"
}): Promise<
  | { success: true; contentType: string; body: Uint8Array }
  | { success: false; status: number; error: string }
> {
  const row = await prisma.approvalRequest.findUnique({
    where: { id: params.requestId },
    select: {
      type: true,
      requestedById: true,
      paymentLines: true,
    },
  })
  if (!row || row.type !== APPROVAL_REQUEST_TYPE.BANK_DEPOSIT) {
    return { success: false, status: 404, error: "Attachment not found." }
  }

  const isAdmin = params.userType === userTypes.admin
  const isOwner = row.requestedById === params.userId
  const canSeeDeposits =
    isAdmin ||
    hasPermission(params.permissions, "approvals", APPROVAL_ACTION.VIEW) ||
    hasPermission(params.permissions, "approvals", APPROVAL_ACTION.APPROVE_BANK_DEPOSIT)
  if (!isAdmin && !isOwner && !canSeeDeposits) {
    return { success: false, status: 403, error: "You don't have permission to view this photo." }
  }

  const snap = depositSnapshot(row.paymentLines)
  if (!snap.slip_image_key) {
    return { success: false, status: 404, error: "No deposit slip was attached." }
  }

  const useThumb = params.size === "thumb" && Boolean(snap.slip_image_thumb_key)
  const key = useThumb ? snap.slip_image_thumb_key! : snap.slip_image_key

  try {
    const { body, contentType } = await getBillAttachmentBytes(key)
    return {
      success: true,
      contentType:
        contentType ||
        (useThumb ? "image/webp" : snap.slip_image_content_type || "image/jpeg"),
      body,
    }
  } catch {
    return { success: false, status: 404, error: "Photo could not be loaded." }
  }
}
