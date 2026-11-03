// EXPORT ALL TYPES RELATED TO TAGS FROM HERE

// Align with old system / migrate: 0=City, 1=Staff Category, 2=Staff Designation, 3=Staff Grade, 4=Bank
export const TAG_TYPES: Record<number, string> = {
    0: 'City',
    1: 'Staff Category',
    2: 'Staff Designation',
    3: 'Staff Grade',
    4: 'Bank',
}

export type Tag = {
    id?: string
    name?: string | null
    type?: number | null   // 0=City, 1=Staff Category, 2=Staff Designation, 3=Staff Grade, 4=Bank (align with old system/migrate)
    status?: number | null // 0 = inactive, 1 = active
    
    // Audit fields
    createdAt?: Date
    updatedAt?: Date
    createdBy?: string | null
    updatedBy?: string | null
    createdUser?: { name?: string } | null
    updatedUser?: { name?: string } | null
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