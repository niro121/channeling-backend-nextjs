"use server"

import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { GetPatientsParams, GetPatientsReturn, Patient } from "@/types/patient"
import { z } from "zod"
import { sriLankaMobileRegex } from "@/lib/regex"

// ==== PATIENT: VALIDATION SCHEMA ==== //
const patientSchema = z.object({
    title: z.string().min(1, "This field is mandatory"),
    name: z
        .string()
        .min(1, "This field is mandatory")
        .max(150, "Must be less than 150 characters"),
    code: z.string().optional().nullable(),
    email: z
        .union([
            z.string().email("Invalid email format"),
            z.literal(""),
            z.null(),
            z.undefined(),
        ])
        .optional()
        .nullable(),
    addressLine1: z.string().optional().nullable(),
    addressLine2: z.string().optional().nullable(),
    dateOfBirth: z.number().optional().nullable(),
    age: z.number().optional().nullable(),
    phone: z
        .string()
        .min(1, "This field is mandatory")
        .regex(sriLankaMobileRegex, "Mobile Number Ex: 07x xxxxxxx"),
    sex: z.string().min(1, "This field is mandatory"),
    status: z
        .number()
        .int()
        .refine((val) => val === 0 || val === 1, {
            message: "Status must be Inactive (0) or Active (1)",
        }),
    areaId: z.string().optional().nullable(),
})

const patientUpdateSchema = patientSchema.partial().extend({
    id: z.string().min(1, "Patient ID is required"),
})

type patientInput = z.infer<typeof patientSchema>

export const createPatient = async (
    payload: Patient
): Promise<{
    success: boolean
    data?: any
    message?: string
    error?: {
        message?: string
        issues?: any
    }
}> => {
    try {
        const parsed = patientSchema.safeParse(payload)

        if (!parsed.success) {
            return {
                success: false,
                error: {
                    message: "Validation failed",
                    issues: parsed.error.flatten().fieldErrors,
                },
            }
        }

        const data = parsed.data

        const patient = await prisma.patient.create({
            data: {
                title: data.title,
                name: data.name,
                code: data.code ?? null,
                email: data.email && data.email !== "" ? data.email : null,
                addressLine1: data.addressLine1 ?? null,
                addressLine2: data.addressLine2 ?? null,
                dateOfBirth: data.dateOfBirth ?? null,
                age: data.age ?? null,
                phone: data.phone,
                sex: data.sex,
                status: data.status,
                areaId: data.areaId ?? null,
            },
        })

        return {
            success: true,
            data: patient,
            message: "Patient created successfully",
        }
    } catch (error: any) {
        console.error("createPatient error:", error)

        if (error.code === "P2002") {
            return {
                success: false,
                error: {
                    message: "Duplicate record detected",
                    issues: error.meta?.target,
                },
            }
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to create patient",
            },
        }
    }
}

export const updatePatient = async (
    id: string,
    payload: Partial<Patient>
): Promise<{
    success: boolean
    data?: any
    message?: string
    error?: {
        message?: string
        issues?: any
    }
}> => {
    try {
        const parsed = patientUpdateSchema.safeParse({
            ...payload,
            id,
        })

        if (!parsed.success) {
            return {
                success: false,
                error: {
                    message: "Validation failed",
                    issues: parsed.error.flatten().fieldErrors,
                },
            }
        }

        const data = parsed.data

        const patient = await prisma.patient.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.name !== undefined && { name: data.name }),
                ...(data.code !== undefined && { code: data.code ?? null }),
                ...(data.email !== undefined && {
                    email: data.email && data.email !== "" ? data.email : null,
                }),
                ...(data.addressLine1 !== undefined && {
                    addressLine1: data.addressLine1 ?? null,
                }),
                ...(data.addressLine2 !== undefined && {
                    addressLine2: data.addressLine2 ?? null,
                }),
                ...(data.dateOfBirth !== undefined && {
                    dateOfBirth: data.dateOfBirth ?? null,
                }),
                ...(data.age !== undefined && { age: data.age ?? null }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.sex !== undefined && { sex: data.sex }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.areaId !== undefined && { areaId: data.areaId ?? null }),
                updatedAt: new Date(),
            },
        })

        return {
            success: true,
            data: patient,
            message: "Patient updated successfully",
        }
    } catch (error: any) {
        console.error("updatePatient error:", error)

        if (error.code === "P2025") {
            return {
                success: false,
                error: {
                    message: "Patient not found",
                },
            }
        }

        if (error.code === "P2002") {
            return {
                success: false,
                error: {
                    message: "Duplicate record detected",
                    issues: error.meta?.target,
                },
            }
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to update patient",
            },
        }
    }
}

export const getPatientById = async (
    id: string
): Promise<{
    success: boolean
    data?: any
    message?: string
    error?: {
        message?: string
    }
}> => {
    try {
        if (!id) {
            return {
                success: false,
                error: {
                    message: "Invalid patient ID",
                },
            }
        }

        const patient = await prisma.patient.findUnique({
            where: { id },
            include: {
                area: true,
            },
        })

        if (!patient) {
            return {
                success: false,
                error: {
                    message: "Patient not found",
                },
            }
        }

        return {
            success: true,
            data: patient,
            message: "Patient fetched successfully",
        }
    } catch (error: any) {
        console.error("getPatientById error:", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to get patient",
            },
        }
    }
}

export const getPatients = async (
    params: GetPatientsParams
): Promise<{
    success: boolean
    data?: {
        records: any[]
        totalRecords: number
    }
    message?: string
    error?: {
        message?: string
    }
}> => {
    try {
        const { page = "1", limit = "10", keyword = "", areaId } = params

        const pageNumber = parseInt(page)
        const pageSize = parseInt(limit)
        const skip = (pageNumber - 1) * pageSize

        const whereClause: Prisma.PatientWhereInput = {
            OR: [
                { name: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
                { phone: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
                { code: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
            ],
            ...(areaId ? { areaId } : {}),
        }

        const [records, totalRecords] = await Promise.all([
            prisma.patient.findMany({
                where: whereClause,
                skip,
                take: pageSize,
                orderBy: { createdAt: "desc" },
                include: {
                    area: true,
                },
            }),
            prisma.patient.count({ where: whereClause }),
        ])

        return {
            success: true,
            data: {
                records,
                totalRecords,
            },
            message: "Patients fetched successfully",
        }
    } catch (error: any) {
        console.log("getPatients error", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to fetch patients",
            },
        }
    }
}

export const deletePatient = async (
    id: string
): Promise<{
    success: boolean
    data?: any
    message?: string
    error?: {
        message?: string
    }
}> => {
    try {
        const patient = await prisma.patient.delete({
            where: { id },
        })

        return {
            success: true,
            data: patient,
            message: "Patient deleted successfully",
        }
    } catch (error: any) {
        console.log("deletePatient error ==> ", error)

        if (error.code === "P2025") {
            return {
                success: false,
                error: {
                    message: "Patient not found",
                },
            }
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to delete patient",
            },
        }
    }
}

export const deletePatients = async (
    ids: string[]
): Promise<{
    success: boolean
    data?: {
        count: number
    }
    message?: string
    error?: {
        message?: string
    }
}> => {
    try {
        if (!ids || ids.length === 0) {
            return {
                success: false,
                error: {
                    message: "No patient IDs provided",
                },
            }
        }

        const result = await prisma.patient.deleteMany({
            where: { id: { in: ids } },
        })

        if (result.count === 0) {
            return {
                success: false,
                error: {
                    message: "No patients found to delete",
                },
            }
        }

        return {
            success: true,
            data: {
                count: result.count,
            },
            message: `${result.count} patient(s) deleted successfully`,
        }
    } catch (error: any) {
        console.log("deletePatients error ==> ", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to delete patients",
            },
        }
    }
}


