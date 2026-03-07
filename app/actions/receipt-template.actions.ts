"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import {
  getActiveReceiptTemplate,
  listReceiptHeaderTemplates,
  getReceiptHeaderTemplateById,
  createReceiptHeaderTemplate,
  updateReceiptHeaderTemplate,
  deleteReceiptHeaderTemplate,
  listReceiptFooterTemplates,
  getReceiptFooterTemplateById,
  createReceiptFooterTemplate,
  updateReceiptFooterTemplate,
  deleteReceiptFooterTemplate,
  listReceiptTemplates,
  getReceiptTemplateById,
  createReceiptTemplate,
  updateReceiptTemplate,
  deleteReceiptTemplate,
} from "@/services/receipt-template/receipt-template.service"
import type {
  ReceiptTemplateRecord,
  ReceiptHeaderTemplateRecord,
  ReceiptFooterTemplateRecord,
} from "@/types/receipt-template-db"

const RECEIPT_TEMPLATES_PATH = "/admin/receipt-templates"

export async function getActiveReceiptTemplateAction(type: string, variant: string) {
  await requirePermission("ledger", "view")
  return getActiveReceiptTemplate(type, variant)
}

// ---------- Header templates ----------
export async function listReceiptHeaderTemplatesAction() {
  await requirePermission("ledger", "view")
  return listReceiptHeaderTemplates()
}

export async function getReceiptHeaderTemplateByIdAction(id: string) {
  await requirePermission("ledger", "view")
  return getReceiptHeaderTemplateById(id)
}

export async function createReceiptHeaderTemplateAction(payload: {
  name: string
  content: string
}) {
  await requirePermission("ledger", "edit")
  const result = await createReceiptHeaderTemplate(payload)
  if (result.success) revalidatePath(RECEIPT_TEMPLATES_PATH)
  return result
}

export async function updateReceiptHeaderTemplateAction(
  id: string,
  payload: { name?: string; content?: string }
) {
  await requirePermission("ledger", "edit")
  const result = await updateReceiptHeaderTemplate(id, payload)
  if (result.success) revalidatePath(RECEIPT_TEMPLATES_PATH)
  return result
}

export async function deleteReceiptHeaderTemplateAction(id: string) {
  await requirePermission("ledger", "edit")
  const result = await deleteReceiptHeaderTemplate(id)
  if (result.success) {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: "admin.receipt-templates.header.deleted",
        entityType: "ReceiptHeaderTemplate",
        entityId: id,
        importance: "high",
      })
    }
    revalidatePath(RECEIPT_TEMPLATES_PATH)
  }
  return result
}

// ---------- Footer templates ----------
export async function listReceiptFooterTemplatesAction() {
  await requirePermission("ledger", "view")
  return listReceiptFooterTemplates()
}

export async function getReceiptFooterTemplateByIdAction(id: string) {
  await requirePermission("ledger", "view")
  return getReceiptFooterTemplateById(id)
}

export async function createReceiptFooterTemplateAction(payload: {
  name: string
  content: string
}) {
  await requirePermission("ledger", "edit")
  const result = await createReceiptFooterTemplate(payload)
  if (result.success) revalidatePath(RECEIPT_TEMPLATES_PATH)
  return result
}

export async function updateReceiptFooterTemplateAction(
  id: string,
  payload: { name?: string; content?: string }
) {
  await requirePermission("ledger", "edit")
  const result = await updateReceiptFooterTemplate(id, payload)
  if (result.success) revalidatePath(RECEIPT_TEMPLATES_PATH)
  return result
}

export async function deleteReceiptFooterTemplateAction(id: string) {
  await requirePermission("ledger", "edit")
  const result = await deleteReceiptFooterTemplate(id)
  if (result.success) {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: "admin.receipt-templates.footer.deleted",
        entityType: "ReceiptFooterTemplate",
        entityId: id,
        importance: "high",
      })
    }
    revalidatePath(RECEIPT_TEMPLATES_PATH)
  }
  return result
}

// ---------- Main receipt templates ----------
export async function listReceiptTemplatesAction() {
  await requirePermission("ledger", "view")
  return listReceiptTemplates()
}

export async function getReceiptTemplateByIdAction(id: string) {
  await requirePermission("ledger", "view")
  return getReceiptTemplateById(id)
}

export async function createReceiptTemplateAction(payload: {
  name: string
  type: string
  variant: string
  headerTemplateId?: string | null
  footerTemplateId?: string | null
  bodyContent: string
  paperWidthMm?: number | null
  paperHeightMm?: number | null
  status?: number
}) {
  await requirePermission("ledger", "edit")
  const result = await createReceiptTemplate(payload)
  if (result.success) {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: "admin.receipt-templates.template.created",
        entityType: "ReceiptTemplate",
        entityId: result.data?.id ?? undefined,
        importance: "high",
      })
    }
    revalidatePath(RECEIPT_TEMPLATES_PATH)
  }
  return result
}

export async function updateReceiptTemplateAction(
  id: string,
  payload: {
    name?: string
    type?: string
    variant?: string
    headerTemplateId?: string | null
    footerTemplateId?: string | null
    bodyContent?: string
    paperWidthMm?: number | null
    paperHeightMm?: number | null
    status?: number
  }
) {
  await requirePermission("ledger", "edit")
  const result = await updateReceiptTemplate(id, payload)
  if (result.success) {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: "admin.receipt-templates.template.updated",
        entityType: "ReceiptTemplate",
        entityId: id,
        importance: "high",
      })
    }
    revalidatePath(RECEIPT_TEMPLATES_PATH)
  }
  return result
}

export async function deleteReceiptTemplateAction(id: string) {
  await requirePermission("ledger", "edit")
  const result = await deleteReceiptTemplate(id)
  if (result.success) {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: "admin.receipt-templates.template.deleted",
        entityType: "ReceiptTemplate",
        entityId: id,
        importance: "high",
      })
    }
    revalidatePath(RECEIPT_TEMPLATES_PATH)
  }
  return result
}
