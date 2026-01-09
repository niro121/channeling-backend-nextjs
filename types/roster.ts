export interface Roster {
    id?: string
    name: string
    departmentId: string
    shiftsPerPersonPerDay: number
    status: number // 0 = unpublish, 1 = publish
    createdAt?: Date
    updatedAt?: Date
}

export interface GetRostersQuery {
    page: number
    limit: number
    keyword?: string
}

export interface GetRostersReturn {
    data: Roster[]
    totalRecords: number
}

export interface GetRostersParams {
    page?: string
    limit?: string
    keyword?: string
}
