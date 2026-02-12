import { User } from './user'

// EXPORT ALL TYPES RELATED TO ZONES FROM HERE
export type Zone = {
    id?: string
    name: string
    description?: string | null
    locationId?: string | null
    visibility: number // 0 = unpublish, 1 = publish
    createdAt?: Date
    updatedAt?: Date
    createdUser?: User | null
    updatedUser?: User | null
    location?: {
        id: string
        name: string
    }
}

export type GetZonesParams = {
    page?: string
    limit?: string
    keyword?: string
}

export type GetZonesQuery = {
    page: number
    limit: number
    keyword: string
}

export type GetZonesReturn = {
    data: Zone[]
    totalRecords: number
}
