// EXPORT ALL TYPES RELATED TO USERS FROM HERE
export type User = {
    id?: string
    name: string
    email: string
    password: string
    confirmPassword?: string
    userType: number // 1 = admin, 2 = staff
    status: number //0 -> inactive, 1 ->  active
    userGroupId?: string | null
    createdAt?: Date
    updatedAt?: Date
}

export type GetUsersParams = {
    page?: string
    limit?: string
    keyword?: string
    userType?: string
}

export type GetUsersQuery = {
    page: number
    limit: number
    keyword: string
    userType?: string
}

export type GetUsersReturn = {
    data: User[]
    totalRecords: number
}

