export type BankAccount = {
  id: string
  name: string
  accountNumber: string
  bankId: string
  bank?: { id: string; name: string | null } | null
  institution: number
  /** Linked cash account balance (display units) */
  balance?: number | null
  accountId?: string | null
  account?: { id: string; name: string; code: string | null } | null
  status: number
  createdAt?: Date
  updatedAt?: Date
}

export type BankAccountFormValues = {
  name: string
  accountNumber: string
  bankId: string
  institution: string
  accountId?: string | null
  status: number
}

export type GetBankAccountsParams = {
  page?: string
  limit?: string
  keyword?: string
  bankId?: string
}

export type GetBankAccountsQuery = {
  page: number
  limit: number
  keyword: string
  bankId?: string | null
}
