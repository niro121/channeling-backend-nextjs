export type BankAccount = {
  id: string
  name: string
  accountNumber: string
  bankId: string
  bank?: { id: string; name: string | null } | null
  locationId: string
  location?: { id: string; name: string; code: string } | null
  status: number
  createdAt?: Date
  updatedAt?: Date
}

export type BankAccountFormValues = {
  name: string
  accountNumber: string
  bankId: string
  locationId: string
  status: number
}

export type GetBankAccountsParams = {
  page?: string
  limit?: string
  keyword?: string
  bankId?: string
  locationId?: string
}

export type GetBankAccountsQuery = {
  page: number
  limit: number
  keyword: string
  bankId?: string | null
  locationId?: string | null
}
