"use server"

import {
  getApiClientsService,
  getApiClientByIdService,
  createApiClientService,
  updateApiClientService,
  deleteApiClientByIdService,
} from "@/services/api-client.service"
import type { GetApiClientsParams, ApiClientFormValues } from "@/types/api-client"
import { requirePermission } from "@/lib/server-permissions"

const DEFAULT_LIMIT = 10

export async function getApiClients(params: GetApiClientsParams) {
  await requirePermission("api-clients", "view")

  const page = params.page ? parseInt(params.page, 10) : 0
  const limit = params.limit ? parseInt(params.limit, 10) : DEFAULT_LIMIT
  const keyword = params.keyword ?? ""

  const result = await getApiClientsService({ page, limit, keyword })

  if (!result.success) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: result.message,
    }
  }

  return {
    success: true,
    data: result.data,
    totalRecords: result.totalRecords,
  }
}

export async function getApiClientById(id: string) {
  await requirePermission("api-clients", "view")

  const result = await getApiClientByIdService(id)
  if (!result.success) {
    return { success: false, data: null, message: result.message }
  }
  return { success: true, data: result.data }
}

export async function createApiClient(payload: { name: string }) {
  await requirePermission("api-clients", "add")

  const result = await createApiClientService(payload)

  if (!result.success) {
    return {
      success: false,
      data: null,
      error: {
        message: result.message,
        issues: result.error?.issues,
      },
    }
  }

  return {
    success: true,
    data: result.data,
    error: null,
  }
}

export async function updateApiClient(id: string, payload: Partial<ApiClientFormValues>) {
  await requirePermission("api-clients", "edit")

  const result = await updateApiClientService(id, payload)

  if (!result.success) {
    return {
      success: false,
      data: null,
      error: {
        message: result.message,
        issues: result.error?.issues,
        code: result.code,
      },
    }
  }

  return {
    success: true,
    data: result.data,
    error: null,
  }
}

export async function deleteApiClient(id: string) {
  await requirePermission("api-clients", "delete")

  const result = await deleteApiClientByIdService(id)

  if (!result.success) {
    return { success: false, message: result.message }
  }
  return { success: true }
}
