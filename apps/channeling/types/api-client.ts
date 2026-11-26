import type { ApiClientScope } from "@/lib/api-client-scopes"

export type ApiClient = {
  id: string
  clientId: string
  name: string
  isBlocked: boolean
  actingUserId: string
  actingUserName: string
  scopes: ApiClientScope[]
  createdAt: string
  updatedAt: string
}

export type ApiClientFormValues = {
  name: string
  isBlocked: boolean
  actingUserId: string
  scopes: ApiClientScope[]
}

export type ApiClientUserOption = {
  id: string
  name: string
}

export type GetApiClientsParams = {
  page?: string
  limit?: string
  keyword?: string
}

export type GetApiClientsQuery = {
  page: number
  limit: number
  keyword: string
}

export type GetApiClientsReturn = {
  data: ApiClient[]
  totalRecords: number
}
