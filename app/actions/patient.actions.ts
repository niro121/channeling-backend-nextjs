"use server"

import { getPatientById, getPatients, createPatient, updatePatient, deletePatient, deletePatients } from "@/services/patient.service"
import { GetPatientsParams, Patient } from "@/types/patient"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"

export const getPatientsAction = async (params: GetPatientsParams) => {
    try {
        const response = await getPatients(params)
        return {
            isError: false,
            data: response,
            errors: {}
        }
    } catch (error: any) {
        return {
            isError: true,
            data: null,
            errors: { message: error.message }
        }
    }
}

export const getPatientByIdAction = async (id: string) => {
    try {
        const response = await getPatientById(id)
        return {
            isError: false,
            data: response,
            errors: {}
        }
    } catch (error: any) {
        return {
            isError: true,
            data: null,
            errors: { message: error.message }
        }
    }
}

export const createPatientAction = async (data: Patient) => {
    try {
        // Sanitize data
        const payload = { ...data }
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt
        delete payload.createdBy
        delete payload.updatedBy

        // Handle relationships and optional fields
        if (payload.areaId === "") payload.areaId = null
        if (payload.code === "") payload.code = null
        if (payload.email === "") payload.email = null
        if (payload.addressLine1 === "") payload.addressLine1 = null
        if (payload.addressLine2 === "") payload.addressLine2 = null
        if (!payload.dateOfBirth) payload.dateOfBirth = null

        const response = await createPatient(payload)
        revalidatePath("/patients")
        return {
            isError: false,
            data: response,
            errors: {}
        }
    } catch (error: any) {
        return {
            isError: true,
            data: null,
            errors: { message: error.message }
        }
    }
}

export const updatePatientAction = async (id: string, data: Partial<Patient>) => {
    try {
        // Sanitize data
        const payload = { ...data }
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt
        delete payload.createdBy
        delete payload.updatedBy

        // Handle relationships and optional fields
        if (payload.areaId === "") payload.areaId = null
        if (payload.code === "") payload.code = null
        if (payload.email === "") payload.email = null
        if (payload.addressLine1 === "") payload.addressLine1 = null
        if (payload.addressLine2 === "") payload.addressLine2 = null
        if (!payload.dateOfBirth) payload.dateOfBirth = null
        
        const response = await updatePatient(id, payload)
        revalidatePath("/patients")
        return {
            isError: false,
            data: response,
            errors: {}
        }
    } catch (error: any) {
        return {
            isError: true,
            data: null,
            errors: { message: error.message }
        }
    }
}


export const deletePatientAction = async (id: string) => {
    try {
        await deletePatient(id)
        revalidatePath("/patients")
        return {
            isError: false,
            data: null,
            errors: {}
        }
    } catch (error: any) {
        return {
            isError: true,
            data: null,
            errors: { message: error.message }
        }
    }
}

export const bulkDeletePatientsAction = async (ids: string[]) => {
    try {
        await deletePatients(ids)
        revalidatePath("/patients")
        return true
    } catch (error: any) {
        throw new Error(error.message ?? "Error deleting records. please try again later")
    }
}

// Fetch Areas for filtering or dropdowns
export const getAreasAction = async () => {
    try {
        // Tag type 1 is assumed to be "Area" based on context or we filter by just existing
        // Since there's no specific "Area" model, we look at Tag with type filter if applicable
        // Or simply all tags if 'type' isn't strictly defined for Area yet. 
        // Based on prompt: "City/Area (Select/Dropdown, populated from a Tag or Area list)"
        // I will assume we fetch all Tags. Refine if Tag schema 'type' is strict.
        const areas = await prisma.tag.findMany({
            where: { 
                status: 1, // Active tags
                type: 1    // Area tags
            }, 
            orderBy: { name: 'asc' }
        })
        return {
            isError: false,
            data: areas,
            errors: {}
        }
    } catch (error: any) {
        return {
            isError: true,
            data: [],
            errors: { message: error.message }
        }
    }
}
