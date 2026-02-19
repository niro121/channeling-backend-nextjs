// EXPORT ALL TYPES RELATED TO DEPARTMENTS FROM HERE
export type Department = {
    id?: string
    name: string
    description?: string | null
    status: number // 0 = unpublish, 1 = publish
    createdAt?: Date
    updatedAt?: Date
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

