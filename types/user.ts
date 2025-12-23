// EXPORT ALL TYPES RELATED TO USERS FROM HERE
export type User = {
    id?: string
    name: string
    email: string
    password: string
    confirmPassword?: string
    role: string
    status: number //0 -> inactive, 1 ->  active
    createdAt?: Date
    updatedAt?: Date
}

export type GetUsersParams = {
    page?: string
    limit?: string
    keyword?: string
    role: string
}

export type GetUsersQuery = {
    page: number
    limit: number
    keyword: string
    role: string
}

export type GetUsersReturn = {
    data: User[]
    totalRecords: number
}

