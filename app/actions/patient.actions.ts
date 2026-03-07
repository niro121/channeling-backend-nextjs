"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPatientById, getPatients, createPatient, updatePatient, deletePatient, deletePatients } from "@/services/patient.service"
import { GetPatientsParams, Patient } from "@/types/patient"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/server-permissions"
import { logActivity } from "@/lib/activity-log"

export const getPatientsAction = async (params: GetPatientsParams) => {
    try {
        const result = await getPatients(params)

        if (!result.success) {
            throw new Error(result.error?.message ?? "Error getting data. please try again later")
        }

        // Return format expected by the page component
        return {
            isError: false,
            data: {
                data: result.data?.records || [],
                totalRecords: result.data?.totalRecords || 0
            },
            errors: {}
        }
    } catch (error: any) {
        console.log('getPatientsAction error', error);
        return {
            isError: true,
            data: null,
            errors: { message: error.message ?? "Error getting data. please try again later" }
        }
    }
}

// ==== GET ALL PATIENTS (for API) ==== //
export const getAllPatients = async (params: GetPatientsParams) => {
    try {
        const result = await getPatients(params)

        if (!result.success) {
            return {
                success: false,
                message: result.error?.message || 'Failed to fetch patients',
                data: [],
                totalRecords: 0
            }
        }

        return {
            success: true,
            data: result.data?.records ?? [],
            totalRecords: result.data?.totalRecords ?? 0,
            message: result.message
        }
    } catch (error: any) {
        console.error('getAllPatients action error:', error)

        return {
            success: false,
            message: error.message || 'Error getting patients. Please try again later',
            data: [],
            totalRecords: 0
        }
    }
}

export const getPatientByIdAction = async (id: string) => {
    try {
        const result = await getPatientById(id)

        if (!result.success || !result.data) {
            throw new Error(result.error?.message || "Patient not found")
        }

        return {
            isError: false,
            data: result.data,
            errors: {}
        }
    } catch (error: any) {
        console.error("Error in getPatientByIdAction:", error.message);
        return {
            isError: true,
            data: null,
            errors: { message: error.message || "Unable to fetch patient." }
        }
    }
}

export const createPatientAction = async (data: Patient) => {
    // Check add permission
    await requirePermission("patients", "add")
    
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

        const result = await createPatient(payload)

        if (!result.success) {
            return {
                isError: true,
                errors: result.error?.issues || {
                    message: result.error?.message ?? "Something went wrong. please try again later"
                },
                data: {}
            }
        }
        const session = await getServerSession(authOptions)
        if (session?.user?.id) {
            await logActivity({
                userId: session.user.id,
                action: "patients.patient.created",
                entityType: "Patient",
                entityId: result.data?.id ?? undefined,
                importance: "high",
            })
        }
        revalidatePath("/patients")
        return {
            isError: false,
            data: {
                saved: true,
                id: result.data?.id
            },
            errors: {}
        }
    } catch (error: any) {
        console.log('createPatientAction error ==>', error);
        return {
            isError: true,
            data: null,
            errors: { message: error.message ?? "Something went wrong. please try again later" }
        }
    }
}

export const updatePatientAction = async (id: string, data: Partial<Patient>) => {
    // Check edit permission
    await requirePermission("patients", "edit")
    
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

        const result = await updatePatient(id, payload)

        if (!result.success) {
            return {
                isError: true,
                errors: result.error?.issues || {
                    message: result.error?.message ?? "Something went wrong. please try again later"
                },
                data: {}
            }
        }
        const session = await getServerSession(authOptions)
        if (session?.user?.id) {
            await logActivity({
                userId: session.user.id,
                action: "patients.patient.updated",
                entityType: "Patient",
                entityId: id,
                importance: "high",
            })
        }
        revalidatePath("/patients")
        return {
            isError: false,
            data: {
                saved: true
            },
            errors: {}
        }
    } catch (error: any) {
        console.log('updatePatientAction error ==>', error);
        return {
            isError: true,
            data: null,
            errors: { message: error.message ?? "Something went wrong. please try again later" }
        }
    }
}


export const deletePatientAction = async (id: string) => {
    // Check delete permission
    await requirePermission("patients", "delete")
    
    try {
        const result = await deletePatient(id)

        if (!result.success) {
            throw new Error(result.error?.message ?? "Error deleting data. please try again later")
        }
        const session = await getServerSession(authOptions)
        if (session?.user?.id) {
            await logActivity({
                userId: session.user.id,
                action: "patients.patient.deleted",
                entityType: "Patient",
                entityId: id,
                importance: "high",
            })
        }
        revalidatePath("/patients")
        return {
            isError: false,
            data: null,
            errors: {}
        }
    } catch (error: any) {
        console.log('deletePatientAction error ==>', error);
        return {
            isError: true,
            data: null,
            errors: { message: error.message ?? "Error deleting data. please try again later" }
        }
    }
}

export const bulkDeletePatientsAction = async (ids: string[]) => {
    // Check delete permission
    await requirePermission("patients", "delete")
    
    try {
        const result = await deletePatients(ids)

        if (!result.success) {
            throw new Error(result.error?.message ?? "Error deleting records. please try again later")
        }

        revalidatePath("/patients")
        return true
    } catch (error: any) {
        console.log('bulkDeletePatientsAction error ==>', error);
        throw new Error(error.message ?? "Error deleting records. please try again later")
    }
}

// Fetch Areas for filtering or dropdowns
export const getAreasAction = async () => {
    try {
        // Tag type 0 = City (Area) per old system / migrate tag list
        const areas = await prisma.tag.findMany({
            where: { 
                status: 1, // Active tags
                type: 0    // City/Area tags
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

// ==== PATIENTS EXPORT ==== //
export const getPatientsExport = async (params: { keyword?: string }) => {
    try {
        const result = await getPatients({
            page: "1",
            limit: "10000", // Get all records
            keyword: params.keyword ?? ""
        })

        if (!result.success || !result.data?.records?.length) {
            return {
                success: false,
                message: result.success ? 'No patients found' : result.error?.message || 'Error getting data'
            }
        }
        const session = await getServerSession(authOptions)
        if (session?.user?.id) {
            await logActivity({
                userId: session.user.id,
                action: "patients.exported",
                entityType: "Patient",
                importance: "medium",
                metadata: { count: result.data?.records?.length ?? 0 },
            })
        }
        return {
            success: true,
            data: result.data.records
        }
    } catch (error: any) {
        console.log('getPatientsExport error', error)
        return {
            success: false,
            message: 'Error getting data'
        }
    }
}