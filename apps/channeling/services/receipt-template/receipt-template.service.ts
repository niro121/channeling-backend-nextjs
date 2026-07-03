import prisma from "@/lib/prisma"
import type {
  ReceiptTemplateRecord,
  ReceiptHeaderTemplateRecord,
  ReceiptFooterTemplateRecord,
} from "@/types/receipt-template-db"
import { replacePlaceholders } from "@/lib/receipt-template/replace-placeholders"

export { replacePlaceholders } from "@/lib/receipt-template/replace-placeholders"

export async function getActiveReceiptTemplate(
  type: string,
  variant: string
): Promise<{
  success: boolean
  data?: ReceiptTemplateRecord
  message?: string
}> {
  try {
    const row = await prisma.receiptTemplate.findFirst({
      where: { type, variant, status: 1 },
      include: {
        headerTemplate: true,
        footerTemplate: true,
      },
      orderBy: { updatedAt: "desc" },
    })
    if (!row) {
      return { success: true, data: undefined }
    }
    return {
      success: true,
      data: mapReceiptTemplate(row),
    }
  } catch (err) {
    console.error("getActiveReceiptTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to load receipt template",
    }
  }
}

function mapReceiptTemplate(row: {
  id: string
  name: string
  type: string
  variant: string
  headerTemplateId: string | null
  footerTemplateId: string | null
  bodyContent: string
  paperWidthMm: number | null
  paperHeightMm: number | null
  status: number
  createdAt: Date
  updatedAt: Date
  headerTemplate?: { id: string; name: string; content: string } | null
  footerTemplate?: { id: string; name: string; content: string } | null
}): ReceiptTemplateRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    variant: row.variant,
    headerTemplateId: row.headerTemplateId,
    footerTemplateId: row.footerTemplateId,
    bodyContent: row.bodyContent,
    paperWidthMm: row.paperWidthMm,
    paperHeightMm: row.paperHeightMm,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    headerTemplate: row.headerTemplate
      ? {
          id: row.headerTemplate.id,
          name: row.headerTemplate.name,
          content: row.headerTemplate.content,
        }
      : null,
    footerTemplate: row.footerTemplate
      ? {
          id: row.footerTemplate.id,
          name: row.footerTemplate.name,
          content: row.footerTemplate.content,
        }
      : null,
  }
}

// ---------- Header templates ----------
export async function listReceiptHeaderTemplates(): Promise<
  { success: boolean; data?: ReceiptHeaderTemplateRecord[]; message?: string }
> {
  try {
    const rows = await prisma.receiptHeaderTemplate.findMany({
      orderBy: { name: "asc" },
    })
    return {
      success: true,
      data: rows.map((r) => ({ id: r.id, name: r.name, content: r.content, createdAt: r.createdAt, updatedAt: r.updatedAt })),
    }
  } catch (err) {
    console.error("listReceiptHeaderTemplates error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to list header templates",
    }
  }
}

export async function getReceiptHeaderTemplateById(
  id: string
): Promise<{ success: boolean; data?: ReceiptHeaderTemplateRecord | null; message?: string }> {
  try {
    const row = await prisma.receiptHeaderTemplate.findUnique({ where: { id } })
    return {
      success: true,
      data: row ? { id: row.id, name: row.name, content: row.content, createdAt: row.createdAt, updatedAt: row.updatedAt } : null,
    }
  } catch (err) {
    console.error("getReceiptHeaderTemplateById error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to load header template",
    }
  }
}

export async function createReceiptHeaderTemplate(payload: {
  name: string
  content: string
}): Promise<{ success: boolean; data?: ReceiptHeaderTemplateRecord; message?: string }> {
  try {
    const row = await prisma.receiptHeaderTemplate.create({
      data: { name: payload.name, content: payload.content },
    })
    return {
      success: true,
      data: { id: row.id, name: row.name, content: row.content, createdAt: row.createdAt, updatedAt: row.updatedAt },
    }
  } catch (err) {
    console.error("createReceiptHeaderTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create header template",
    }
  }
}

export async function updateReceiptHeaderTemplate(
  id: string,
  payload: { name?: string; content?: string }
): Promise<{ success: boolean; data?: ReceiptHeaderTemplateRecord; message?: string }> {
  try {
    const row = await prisma.receiptHeaderTemplate.update({
      where: { id },
      data: { name: payload.name, content: payload.content },
    })
    return {
      success: true,
      data: { id: row.id, name: row.name, content: row.content, createdAt: row.createdAt, updatedAt: row.updatedAt },
    }
  } catch (err) {
    console.error("updateReceiptHeaderTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update header template",
    }
  }
}

export async function deleteReceiptHeaderTemplate(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await prisma.receiptHeaderTemplate.delete({ where: { id } })
    return { success: true }
  } catch (err) {
    console.error("deleteReceiptHeaderTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete header template",
    }
  }
}

// ---------- Footer templates ----------
export async function getReceiptFooterTemplateById(
  id: string
): Promise<{ success: boolean; data?: ReceiptFooterTemplateRecord | null; message?: string }> {
  try {
    const row = await prisma.receiptFooterTemplate.findUnique({ where: { id } })
    return {
      success: true,
      data: row ? { id: row.id, name: row.name, content: row.content, createdAt: row.createdAt, updatedAt: row.updatedAt } : null,
    }
  } catch (err) {
    console.error("getReceiptFooterTemplateById error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to load footer template",
    }
  }
}

export async function listReceiptFooterTemplates(): Promise<
  { success: boolean; data?: ReceiptFooterTemplateRecord[]; message?: string }
> {
  try {
    const rows = await prisma.receiptFooterTemplate.findMany({
      orderBy: { name: "asc" },
    })
    return {
      success: true,
      data: rows.map((r) => ({ id: r.id, name: r.name, content: r.content, createdAt: r.createdAt, updatedAt: r.updatedAt })),
    }
  } catch (err) {
    console.error("listReceiptFooterTemplates error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to list footer templates",
    }
  }
}

export async function createReceiptFooterTemplate(payload: {
  name: string
  content: string
}): Promise<{ success: boolean; data?: ReceiptFooterTemplateRecord; message?: string }> {
  try {
    const row = await prisma.receiptFooterTemplate.create({
      data: { name: payload.name, content: payload.content },
    })
    return {
      success: true,
      data: { id: row.id, name: row.name, content: row.content, createdAt: row.createdAt, updatedAt: row.updatedAt },
    }
  } catch (err) {
    console.error("createReceiptFooterTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create footer template",
    }
  }
}

export async function updateReceiptFooterTemplate(
  id: string,
  payload: { name?: string; content?: string }
): Promise<{ success: boolean; data?: ReceiptFooterTemplateRecord; message?: string }> {
  try {
    const row = await prisma.receiptFooterTemplate.update({
      where: { id },
      data: { name: payload.name, content: payload.content },
    })
    return {
      success: true,
      data: { id: row.id, name: row.name, content: row.content, createdAt: row.createdAt, updatedAt: row.updatedAt },
    }
  } catch (err) {
    console.error("updateReceiptFooterTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update footer template",
    }
  }
}

export async function deleteReceiptFooterTemplate(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await prisma.receiptFooterTemplate.delete({ where: { id } })
    return { success: true }
  } catch (err) {
    console.error("deleteReceiptFooterTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete footer template",
    }
  }
}

// ---------- Main receipt templates ----------
export async function listReceiptTemplates(): Promise<
  { success: boolean; data?: ReceiptTemplateRecord[]; message?: string }
> {
  try {
    const rows = await prisma.receiptTemplate.findMany({
      include: { headerTemplate: true, footerTemplate: true },
      orderBy: [{ type: "asc" }, { variant: "asc" }],
    })
    return {
      success: true,
      data: rows.map((r) => mapReceiptTemplate(r)),
    }
  } catch (err) {
    console.error("listReceiptTemplates error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to list receipt templates",
    }
  }
}

export async function getReceiptTemplateById(
  id: string
): Promise<{ success: boolean; data?: ReceiptTemplateRecord | null; message?: string }> {
  try {
    const row = await prisma.receiptTemplate.findUnique({
      where: { id },
      include: { headerTemplate: true, footerTemplate: true },
    })
    return {
      success: true,
      data: row ? mapReceiptTemplate(row) : null,
    }
  } catch (err) {
    console.error("getReceiptTemplateById error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to load receipt template",
    }
  }
}

export async function createReceiptTemplate(payload: {
  name: string
  type: string
  variant: string
  headerTemplateId?: string | null
  footerTemplateId?: string | null
  bodyContent: string
  paperWidthMm?: number | null
  paperHeightMm?: number | null
  status?: number
}): Promise<{ success: boolean; data?: ReceiptTemplateRecord; message?: string }> {
  try {
    const row = await prisma.receiptTemplate.create({
      data: {
        name: payload.name,
        type: payload.type,
        variant: payload.variant,
        headerTemplateId: payload.headerTemplateId ?? null,
        footerTemplateId: payload.footerTemplateId ?? null,
        bodyContent: payload.bodyContent,
        paperWidthMm: payload.paperWidthMm ?? null,
        paperHeightMm: payload.paperHeightMm ?? null,
        status: payload.status ?? 1,
      },
      include: { headerTemplate: true, footerTemplate: true },
    })
    return { success: true, data: mapReceiptTemplate(row) }
  } catch (err) {
    console.error("createReceiptTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create receipt template",
    }
  }
}

export async function updateReceiptTemplate(
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
): Promise<{ success: boolean; data?: ReceiptTemplateRecord; message?: string }> {
  try {
    const row = await prisma.receiptTemplate.update({
      where: { id },
      data: {
        name: payload.name,
        type: payload.type,
        variant: payload.variant,
        headerTemplateId: payload.headerTemplateId,
        footerTemplateId: payload.footerTemplateId,
        bodyContent: payload.bodyContent,
        paperWidthMm: payload.paperWidthMm,
        paperHeightMm: payload.paperHeightMm,
        status: payload.status,
      },
      include: { headerTemplate: true, footerTemplate: true },
    })
    return { success: true, data: mapReceiptTemplate(row) }
  } catch (err) {
    console.error("updateReceiptTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update receipt template",
    }
  }
}

export async function deleteReceiptTemplate(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await prisma.receiptTemplate.delete({ where: { id } })
    return { success: true }
  } catch (err) {
    console.error("deleteReceiptTemplate error", err)
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete receipt template",
    }
  }
}
