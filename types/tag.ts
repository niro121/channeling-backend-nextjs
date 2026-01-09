// EXPORT ALL TYPES RELATED TO TAGS FROM HERE

export type Tag = {
    id?: string
    name?: string | null
    type?: number | null   // e.g., 1 = Area, 2 = Bank, etc.
    status?: number | null // 0 = inactive, 1 = active
    
    // Audit fields
    createdAt?: Date
    updatedAt?: Date
    createdBy?: string | null
    updatedBy?: string | null
}

export type GetTagsParams = {
    page?: string
    limit?: string
    keyword?: string
    type?: string // Useful to filter only "Areas" or only "Banks"
}

export type GetTagsQuery = {
    page: number
    limit: number
    keyword: string
    type?: number
}

export type GetTagsReturn = {
    data: Tag[]
    totalRecords: number
}