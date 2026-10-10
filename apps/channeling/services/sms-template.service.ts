"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import type { SmsTemplate, SmsTemplateFormValues, GetSmsTemplateQuery } from "@/types/sms-template"

const smsTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Must be less than 200 characters"),
  type: z.number().int().min(0).max(5).nullable(),
  message: z.string().min(1, "Message is required"),
  status: z.number().int().refine((v) => v === 0 || v === 1, {
    message: "Status must be Inactive (0) or Active (1)",
  }),
})

export async function getAllSmsTemplatesService(
  query: GetSmsTemplateQuery
): Promise<{
  success: boolean
  data?: SmsTemplate[]
  totalRecords?: number
  message?: string
  error?: { message?: string }
}> {
  try {
    const where: Prisma.SmsTemplateWhereInput = {}
    if (query.keyword?.trim()) {
      where.OR = [
        { name: { contains: query.keyword.trim(), mode: "insensitive" } },
        { message: { contains: query.keyword.trim(), mode: "insensitive" } },
      ]
    }
    if (query.type != null) {
      where.type = query.type
    }
    if (query.status != null) {
      where.status = query.status
    }

    const skip = query.page * query.limit
    const [records, totalRecords] = await Promise.all([
      prisma.smsTemplate.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.smsTemplate.count({ where }),
    ])

    return {
      success: true,
      data: records as SmsTemplate[],
      totalRecords,
    }
  } catch (error: unknown) {
    console.error("getAllSmsTemplatesService error", error)
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : "Failed to fetch SMS templates" },
    }
  }
}

export async function getSmsTemplateByIdService(
  id: string
): Promise<{ success: boolean; data?: SmsTemplate | null; message?: string }> {
  try {
    const record = await prisma.smsTemplate.findUnique({
      where: { id },
    })
    return { success: true, data: record as SmsTemplate | null }
  } catch (error: unknown) {
    console.error("getSmsTemplateByIdService error", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch SMS template",
    }
  }
}

export async function createSmsTemplateService(
  payload: SmsTemplateFormValues
): Promise<{
  success: boolean
  data?: SmsTemplate
  message?: string
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  try {
    const parsed = smsTemplateSchema.safeParse(payload)
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: "Validation failed",
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      }
    }
    const data = parsed.data
    const record = await prisma.smsTemplate.create({
      data: {
        name: data.name,
        type: data.type ?? undefined,
        message: data.message,
        status: data.status,
      },
    })
    return { success: true, data: record as SmsTemplate, message: "SMS template created successfully." }
  } catch (error: unknown) {
    console.error("createSmsTemplateService error", error)
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : "Failed to create SMS template" },
    }
  }
}

export async function updateSmsTemplateService(
  id: string,
  payload: Partial<SmsTemplateFormValues>
): Promise<{
  success: boolean
  data?: SmsTemplate
  message?: string
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  try {
    const parsed = smsTemplateSchema.partial().safeParse(payload)
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: "Validation failed",
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
      }
    }
    const data = parsed.data
    const record = await prisma.smsTemplate.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.message != null && { message: data.message }),
        ...(data.status != null && { status: data.status }),
      },
    })
    return { success: true, data: record as SmsTemplate, message: "SMS template updated successfully." }
  } catch (error: unknown) {
    console.error("updateSmsTemplateService error", error)
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : "Failed to update SMS template" },
    }
  }
}

export async function deleteSmsTemplateByIdService(
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await prisma.smsTemplate.delete({ where: { id } })
    return { success: true, message: "SMS template deleted successfully." }
  } catch (error: unknown) {
    console.error("deleteSmsTemplateByIdService error", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete SMS template",
    }
  }
}

export async function bulkDeleteSmsTemplatesByIdsService(
  ids: string[]
): Promise<{ success: boolean; message?: string }> {
  try {
    await prisma.smsTemplate.deleteMany({ where: { id: { in: ids } } })
    return { success: true, message: "SMS templates deleted successfully." }
  } catch (error: unknown) {
    console.error("bulkDeleteSmsTemplatesByIdsService error", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete SMS templates",
    }
  }
}
