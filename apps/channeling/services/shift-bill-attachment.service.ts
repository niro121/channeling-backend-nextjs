import prisma from "@/lib/prisma"
import { getCurrentShift } from "@/services/shift.service"
import { SHIFT_STATUS } from "@/types/shift"
import { HANDOVER_STATUS } from "@/types/handover"
import {
  SHIFT_BILL_ALLOWED_CONTENT_TYPES,
  SHIFT_BILL_MAX_BYTES,
  isShiftBillKind,
  type ShiftBillAttachmentDto,
  type ShiftBillKind,
} from "@/types/shift-bill-attachment"
import {
  deleteBillAttachmentObject,
  getBillAttachmentBytes,
  getBillAttachmentObjectKey,
  getBillAttachmentThumbKey,
  headBillAttachmentObject,
  presignBillAttachmentPut,
  putBillAttachmentObject,
} from "@/lib/s3"
import sharp from "sharp"
import { hasPermission } from "@/lib/permissions"
import { userTypes } from "@/lib/roles"
import type { Permissions } from "@/types/user-group"

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function toDto(row: {
  id: string
  shiftId: string
  handoverId: string | null
  contentType: string
  sizeBytes: number
  kind: string | null
  note: string | null
  uploadedAt: Date | null
  createdAt: Date
}): ShiftBillAttachmentDto {
  return {
    id: row.id,
    shiftId: row.shiftId,
    handoverId: row.handoverId,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    kind: isShiftBillKind(row.kind) ? row.kind : null,
    note: row.note,
    uploadedAt: row.uploadedAt ? row.uploadedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    viewUrl: `/api/shift-attachments/${row.id}`,
    thumbUrl: `/api/shift-attachments/${row.id}?size=thumb`,
  }
}

export function canUploadToShiftStatus(status: number): boolean {
  return status === SHIFT_STATUS.ACTIVE
}

function uploadBlockedMessage(status: number): string {
  if (status === SHIFT_STATUS.PAUSED) {
    return "Your shift is paused. Resume it from Channel Booking before photographing bills."
  }
  if (status === SHIFT_STATUS.HANDOVER_PENDING) {
    return "Handover is already pending. Cancel it to add more photos."
  }
  return "This shift is closed. Photos cannot be added."
}

export async function requestShiftBillUpload(params: {
  userId: string
  contentType: string
  sizeBytes: number
  kind?: string | null
  note?: string | null
}): Promise<
  | { success: true; attachment: ShiftBillAttachmentDto; uploadUrl: string }
  | { success: false; error: string }
> {
  const contentType = params.contentType.trim().toLowerCase()
  if (!(SHIFT_BILL_ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    return { success: false, error: "Only JPEG, PNG, or WebP images are allowed." }
  }
  if (!Number.isFinite(params.sizeBytes) || params.sizeBytes <= 0 || params.sizeBytes > SHIFT_BILL_MAX_BYTES) {
    return { success: false, error: "Image must be 2 MB or smaller." }
  }

  const shift = await getCurrentShift(params.userId)
  if (!shift) {
    return { success: false, error: "Start a shift before photographing bills." }
  }
  if (!canUploadToShiftStatus(shift.status)) {
    return {
      success: false,
      error: uploadBlockedMessage(shift.status),
    }
  }

  const kind = isShiftBillKind(params.kind ?? null) ? (params.kind as ShiftBillKind) : null
  const note = params.note?.trim() ? params.note.trim().slice(0, 200) : null

  const created = await prisma.shiftBillAttachment.create({
    data: {
      shiftId: shift.id,
      contentType,
      sizeBytes: params.sizeBytes,
      kind,
      note,
      uploadedById: params.userId,
      s3Key: "pending",
    },
  })

  const s3Key = getBillAttachmentObjectKey(
    shift.id,
    created.id,
    EXT_BY_CONTENT_TYPE[contentType] ?? "jpg"
  )
  const updated = await prisma.shiftBillAttachment.update({
    where: { id: created.id },
    data: { s3Key },
  })

  try {
    const uploadUrl = await presignBillAttachmentPut(s3Key, contentType)
    return { success: true, attachment: toDto(updated), uploadUrl }
  } catch (error) {
    await prisma.shiftBillAttachment.delete({ where: { id: created.id } }).catch(() => undefined)
    const message = error instanceof Error ? error.message : "Could not prepare upload."
    return { success: false, error: message }
  }
}

export async function confirmShiftBillUpload(params: {
  userId: string
  attachmentId: string
}): Promise<{ success: true; attachment: ShiftBillAttachmentDto } | { success: false; error: string }> {
  const row = await prisma.shiftBillAttachment.findUnique({
    where: { id: params.attachmentId },
  })
  if (!row || row.uploadedById !== params.userId) {
    return { success: false, error: "Attachment not found." }
  }
  if (row.uploadedAt) {
    return { success: true, attachment: toDto(row) }
  }

  const exists = await headBillAttachmentObject(row.s3Key)
  if (!exists) {
    return { success: false, error: "Upload did not complete. Try again." }
  }

  let thumbS3Key: string | null = row.thumbS3Key ?? null
  try {
    const original = await getBillAttachmentBytes(row.s3Key)
    const thumbBytes = await sharp(original.body)
      .rotate()
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer()
    thumbS3Key = getBillAttachmentThumbKey(row.s3Key)
    await putBillAttachmentObject(thumbS3Key, new Uint8Array(thumbBytes), "image/webp")
  } catch {
    thumbS3Key = null
  }

  const updated = await prisma.shiftBillAttachment.update({
    where: { id: row.id },
    data: { uploadedAt: new Date(), thumbS3Key },
  })
  return { success: true, attachment: toDto(updated) }
}

export async function listShiftBillAttachmentsForShift(params: {
  userId: string
  shiftId?: string
}): Promise<{ success: true; data: ShiftBillAttachmentDto[] } | { success: false; error: string }> {
  const shift = params.shiftId
    ? await prisma.shift.findFirst({ where: { id: params.shiftId } })
    : await getCurrentShift(params.userId)

  if (!shift) {
    return { success: true, data: [] }
  }
  if (shift.userId !== params.userId) {
    return { success: false, error: "You can only list photos for your own shift." }
  }

  const rows = await prisma.shiftBillAttachment.findMany({
    where: { shiftId: shift.id, uploadedAt: { not: null } },
    orderBy: { createdAt: "desc" },
  })
  return { success: true, data: rows.map(toDto) }
}

export async function listShiftBillAttachmentsForHandover(
  handoverId: string
): Promise<ShiftBillAttachmentDto[]> {
  const rows = await prisma.shiftBillAttachment.findMany({
    where: { handoverId, uploadedAt: { not: null } },
    orderBy: { createdAt: "asc" },
  })
  return rows.map(toDto)
}

export async function deleteShiftBillAttachment(params: {
  userId: string
  attachmentId: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const row = await prisma.shiftBillAttachment.findUnique({
    where: { id: params.attachmentId },
    include: {
      shift: { select: { userId: true, status: true } },
      handover: { select: { status: true, fromUserId: true } },
    },
  })
  if (!row) {
    return { success: false, error: "Attachment not found." }
  }
  if (row.shift.userId !== params.userId && row.uploadedById !== params.userId) {
    return { success: false, error: "You cannot delete this photo." }
  }
  if (row.handoverId && row.handover) {
    if (row.handover.status !== HANDOVER_STATUS.PENDING || row.handover.fromUserId !== params.userId) {
      return { success: false, error: "This photo is already attached to a handover." }
    }
  }

  try {
    await deleteBillAttachmentObject(row.s3Key)
    if (row.thumbS3Key) {
      await deleteBillAttachmentObject(row.thumbS3Key)
    }
  } catch {
    // Continue so a missing S3 object cannot trap the cashier.
  }
  await prisma.shiftBillAttachment.delete({ where: { id: row.id } })
  return { success: true }
}

export async function attachShiftBillsToHandover(params: {
  shiftId: string
  fromUserId: string
  handoverId: string
  attachmentIds: string[]
}): Promise<{ success: true } | { success: false; error: string }> {
  const ids = [...new Set(params.attachmentIds.filter((id) => typeof id === "string" && id.trim()))]
  if (ids.length === 0) return { success: true }

  const rows = await prisma.shiftBillAttachment.findMany({
    where: { id: { in: ids } },
  })
  if (rows.length !== ids.length) {
    return { success: false, error: "One or more bill photos were not found." }
  }
  const invalid = rows.find(
    (row) =>
      row.shiftId !== params.shiftId ||
      row.uploadedById !== params.fromUserId ||
      !row.uploadedAt ||
      row.handoverId != null
  )
  if (invalid) {
    return { success: false, error: "One or more bill photos cannot be attached to this handover." }
  }

  await prisma.shiftBillAttachment.updateMany({
    where: { id: { in: ids } },
    data: { handoverId: params.handoverId },
  })
  return { success: true }
}

export async function unlinkShiftBillsFromHandover(handoverId: string): Promise<void> {
  await prisma.shiftBillAttachment.updateMany({
    where: { handoverId },
    data: { handoverId: null },
  })
}

export async function getShiftBillAttachmentForView(params: {
  attachmentId: string
  userId: string
  userType: number
  permissions: Permissions | null | undefined
  size?: "full" | "thumb"
}): Promise<
  | { success: true; contentType: string; body: Uint8Array }
  | { success: false; status: number; error: string }
> {
  const row = await prisma.shiftBillAttachment.findUnique({
    where: { id: params.attachmentId },
    include: {
      shift: { select: { userId: true } },
      handover: { select: { fromUserId: true, toUserId: true } },
    },
  })
  if (!row || !row.uploadedAt) {
    return { success: false, status: 404, error: "Attachment not found." }
  }

  const isAdmin = params.userType === userTypes.admin
  const isShiftOwner = row.shift.userId === params.userId
  const isUploader = row.uploadedById === params.userId
  const isHandoverParty =
    row.handover?.fromUserId === params.userId || row.handover?.toUserId === params.userId
  const canViewAny = hasPermission(params.permissions, "handover", "view-any")

  if (!isAdmin && !isShiftOwner && !isUploader && !isHandoverParty && !canViewAny) {
    return { success: false, status: 403, error: "You don't have permission to view this photo." }
  }

  try {
    const key =
      params.size === "thumb" && row.thumbS3Key ? row.thumbS3Key : row.s3Key
    const { body, contentType } = await getBillAttachmentBytes(key)
    return {
      success: true,
      contentType: contentType || (params.size === "thumb" && row.thumbS3Key ? "image/webp" : row.contentType),
      body,
    }
  } catch {
    return { success: false, status: 404, error: "Photo could not be loaded." }
  }
}
