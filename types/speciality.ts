export type Speciality = {
  id?: string
  name: string
  code: string
  description: string
  status: number // == 0: unpublish, 1: publish == //
  createdBy?: string | null
  updatedBy?: string | null
  createdAt?: Date | undefined
  updatedAt?: Date | undefined
}

export type getSpecialityParams = {
  page?: string
  limit?: string
  keyword?: string
}

export type getSpecialityQuery = {
  page: number
  limit: number
  keyword: string
}

export type GetSpecialityResponse = {
  data: Speciality[]
  totalRecords: number
}