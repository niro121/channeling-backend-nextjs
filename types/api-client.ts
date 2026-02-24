export type ApiClient = {
  id: string
  clientId: string
  name: string
  isBlocked: boolean
  createdAt: string
  updatedAt: string
}

export type ApiClientFormValues = {
  name: string
  isBlocked: boolean
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
