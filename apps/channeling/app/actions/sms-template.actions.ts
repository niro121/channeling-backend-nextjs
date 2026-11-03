"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import {
  getAllSmsTemplatesService,
  getSmsTemplateByIdService,
  createSmsTemplateService,
  updateSmsTemplateService,
  deleteSmsTemplateByIdService,
  bulkDeleteSmsTemplatesByIdsService,
} from "@/services/sms-template.service"
import type {
  SmsTemplate,
  SmsTemplateFormValues,
  GetSmsTemplateParam,
  GetSmsTemplateQuery,
} from "@/types/sms-template"

const DEFAULT_PAGE = 0
const DEFAULT_PER_PAGE = 10

function toQuery(params: GetSmsTemplateParam): GetSmsTemplateQuery {
  return {
    page: params.page != null ? parseInt(params.page, 10) : DEFAULT_PAGE,
    limit: params.limit != null ? parseInt(params.limit, 10) : DEFAULT_PER_PAGE,
    keyword: params.keyword ?? "",
    type: params.type != null && params.type !== "" ? parseInt(params.type, 10) : undefined,
    status: params.status != null && params.status !== "" ? parseInt(params.status, 10) : undefined,
  }
}

export async function getAllSmsTemplates(params: GetSmsTemplateParam) {
  await requirePermission("sms-templates", "view")
  const query = toQuery(params)
  const response = await getAllSmsTemplatesService(query)
  if (!response.success) {
    return {
      success: false,
      message: response.error?.message ?? "Failed to fetch SMS templates",
      data: [],
      totalRecords: 0,
    }
  }
  return {
    success: true,
    data: response.data ?? [],
    totalRecords: response.totalRecords ?? 0,
  }
}

export async function getSmsTemplateById(id: string) {
  await requirePermission("sms-templates", "view")
  const response = await getSmsTemplateByIdService(id)
  if (!response.success) {
    return { success: false, message: response.message, data: null }
  }
  return { success: true, data: response.data ?? null }
}

export async function createSmsTemplate(payload: SmsTemplateFormValues) {
  await requirePermission("sms-templates", "add")
  const response = await createSmsTemplateService(payload)
  if (!response.success) {
    return {
      success: false,
      message: response.error?.message,
      error: response.error,
      data: null,
    }
  }
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: "sms-templates.template.created",
      entityType: "SmsTemplate",
      entityId: response.data?.id ?? undefined,
      importance: "high",
    })
  }
  revalidatePath("/sms-templates")
  return { success: true, data: response.data ?? null, message: response.message }
}

export async function updateSmsTemplate(id: string, payload: Partial<SmsTemplateFormValues>) {
  await requirePermission("sms-templates", "edit")
  const response = await updateSmsTemplateService(id, payload)
  if (!response.success) {
    return {
      success: false,
      message: response.error?.message,
      error: response.error,
      data: null,
    }
  }
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: "sms-templates.template.updated",
      entityType: "SmsTemplate",
      entityId: id,
      importance: "high",
    })
  }
  revalidatePath("/sms-templates")
  revalidatePath(`/sms-templates/${id}/edit`)
  return { success: true, data: response.data ?? null, message: response.message }
}

export async function deleteSmsTemplate(id: string) {
  await requirePermission("sms-templates", "delete")
  const response = await deleteSmsTemplateByIdService(id)
  if (!response.success) {
    return { success: false, message: response.message }
  }
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: "sms-templates.template.deleted",
      entityType: "SmsTemplate",
      entityId: id,
      importance: "high",
    })
  }
  revalidatePath("/sms-templates")
  return { success: true, message: response.message }
}

export async function bulkDeleteSmsTemplates(ids: string[]) {
  await requirePermission("sms-templates", "delete")
  if (!ids?.length) {
    return { success: false, message: "No IDs provided." }
  }
  const response = await bulkDeleteSmsTemplatesByIdsService(ids)
  if (!response.success) {
    return { success: false, message: response.message }
  }
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: "sms-templates.templates.bulkDeleted",
      entityType: "SmsTemplate",
      importance: "high",
      metadata: { count: ids.length },
    })
  }
  revalidatePath("/sms-templates")
  return { success: true, message: response.message }
}
