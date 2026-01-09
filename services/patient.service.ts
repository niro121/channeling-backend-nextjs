import { prisma } from "@/lib/prisma"
import { GetPatientsParams, GetPatientsReturn, Patient } from "@/types/patient"

export const createPatient = async (data: Patient) => {
    return await prisma.patient.create({
        data,
    })
}

export const updatePatient = async (id: string, data: Partial<Patient>) => {
    return await prisma.patient.update({
        where: { id },
        data,
    })
}

export const getPatientById = async (id: string) => {
    return await prisma.patient.findUnique({
        where: { id },
        include: {
            area: true 
        }
    })
}

export const getPatients = async (
    params: GetPatientsParams
): Promise<GetPatientsReturn> => {
    const { page = "1", limit = "10", keyword = "", areaId } = params
    
    const pageNumber = parseInt(page)
    const pageSize = parseInt(limit)
    const skip = (pageNumber - 1) * pageSize

    const where: any = {
        OR: [
            { name: { contains: keyword, mode: "insensitive" } },
            { phone: { contains: keyword, mode: "insensitive" } },
            { code: { contains: keyword, mode: "insensitive" } },
        ],
    }

    if (areaId) {
        where.areaId = areaId
    }

    const [data, totalRecords] = await Promise.all([
        prisma.patient.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
            include: {
                area: true
            }
        }),
        prisma.patient.count({ where }),
    ])

    return {
        data: data as Patient[],
        totalRecords,
    }
}

export const deletePatient = async (id: string) => {
    return await prisma.patient.delete({
        where: { id }
    })
}

export const deletePatients = async (ids: string[]) => {
    return await prisma.patient.deleteMany({
        where: { id: { in: ids } }
    })
}


