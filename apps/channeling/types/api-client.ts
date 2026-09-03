export type ApiClient = {
  id: string
  clientId: string
  name: string
  isBlocked: boolean
  actingUserId: string
  actingUserName: string
  createdAt: string
  updatedAt: string
}

export type ApiClientFormValues = {
  name: string
  isBlocked: boolean
  actingUserId: string
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
