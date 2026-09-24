// EXPORT ALL TYPES RELATED TO PATIENTS FROM HERE

export type Patient = {
    id?: string
    title: string
    name: string
    code?: string | null
    email?: string | null
    addressLine1?: string | null
    addressLine2?: string | null
    dateOfBirth?: number | null
    age?: number | null
    phone: string
    sex: string
    status: number // 0 = inactive, 1 = active (or your specific logic)
    
    // Relation field
    areaId?: string | null
    
    // Audit fields
    createdAt?: Date
    updatedAt?: Date
    createdBy?: string | null
    updatedBy?: string | null
}

export type GetPatientsParams = {
    page?: string
    limit?: string
    keyword?: string
    areaId?: string // Added specifically for filtering by area
}

export type GetPatientsQuery = {
    page: number
    limit: number
    keyword: string
    areaId?: string
}

export type GetPatientsReturn = {
    data: Patient[]
    totalRecords: number
}

// Zod schema compatible type for form inputs - Removed as we switched to Formik/Yup

