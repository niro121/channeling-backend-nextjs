// EXPORT ALL TYPES RELATED TO DEPARTMENTS FROM HERE
export type Department = {
    id?: string
    name: string
    description?: string | null
    institution?: number | null // 0=RH, 1=RHD, 2=RHT, 3=RPS
    status: number // 0 = unpublish, 1 = publish
    createdAt?: Date
    updatedAt?: Date
    createdBy?: string | null
    updatedBy?: string | null
    createdUser?: { name?: string } | null
    updatedUser?: { name?: string } | null
}

export type GetDepartmentsParams = {
    page?: string
    limit?: string
    keyword?: string
}

export type GetDepartmentsQuery = {
    page: number
    limit: number
    keyword: string
}

export type GetDepartmentsReturn = {
    data: Department[]
    totalRecords: number
}

