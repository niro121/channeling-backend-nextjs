"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { requirePermission } from "@/lib/server-permissions"
import {
  confirmShiftBillUpload,
  deleteShiftBillAttachment,
  listShiftBillAttachmentsForShift,
  requestShiftBillUpload,
} from "@/services/shift-bill-attachment.service"

const SHIFT_RESOURCE = "shift"

async function requireShiftUser() {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

export async function requestShiftBillUploadAction(input: {
  contentType: string
  sizeBytes: number
  kind?: string | null
  note?: string | null
}) {
  const userId = await requireShiftUser()
  return requestShiftBillUpload({
    userId,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    kind: input.kind,
    note: input.note,
  })
}

export async function confirmShiftBillUploadAction(attachmentId: string) {
  const userId = await requireShiftUser()
  return confirmShiftBillUpload({ userId, attachmentId })
}

export async function listMyShiftBillAttachmentsAction() {
  const userId = await requireShiftUser()
  return listShiftBillAttachmentsForShift({ userId })
}

export async function deleteShiftBillAttachmentAction(attachmentId: string) {
  const userId = await requireShiftUser()
  return deleteShiftBillAttachment({ userId, attachmentId })
}
