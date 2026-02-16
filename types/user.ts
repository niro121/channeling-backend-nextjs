type Location = {
    id: string
    name: string
}

// EXPORT ALL TYPES RELATED TO USERS FROM HERE
export type User = {
    id?: string
    name: string
    email: string
    password: string
    confirmPassword?: string
    userType: number // 1 = admin, 2 = staff
    status: number //0 -> inactive, 1 ->  active
    checkedDefaultLocation: boolean // == false: not selected default location | true: selected default selection == //
    defaultLocation?: string | null
    userLocationId?: string | null
    userLocation?: Location | null
    bookingLocations?: { locationId: string; location?: Location }[]
    bookingLocationIds?: string[] // form-only: ids for multi-select, synced to bookingLocations
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

