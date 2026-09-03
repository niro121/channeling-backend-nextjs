import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

/** Public API doctor DTO for external apps (e.g. DPAY bill breakdown). */
export type PublicDoctorDto = {
  id: string
  title: string
  name: string
  code: string
  specialityId: string | null
  specialityName: string | null
}

export type GetPublicDoctorsResult =
  | { success: true; data: PublicDoctorDto[] }
  | {
      success: false
      code: "server_error"
      message: string
    }

/**
 * Published doctors for Public API consumers.
 * Optional keyword matches name, code, title, or speciality name.
 */
export async function getPublicDoctors(
  keyword?: string | null
): Promise<GetPublicDoctorsResult> {
  try {
    const trimmedKeyword = keyword?.trim()

    const where: Prisma.DoctorWhereInput = {
      status: 1,
      ...(trimmedKeyword
        ? {
            OR: [
              {
                name: {
                  contains: trimmedKeyword,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                code: {
                  contains: trimmedKeyword,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                title: {
                  contains: trimmedKeyword,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                speciality: {
                  name: {
                    contains: trimmedKeyword,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            ],
          }
        : {}),
    }

    const records = await prisma.doctor.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        title: true,
        name: true,
        code: true,
        specialityId: true,
        speciality: { select: { name: true } },
      },
    })

    const data: PublicDoctorDto[] = records
      .filter((r) => r.id)
      .map((r) => {
        const specialityName = r.speciality?.name ?? null
        return {
          id: r.id,
          title: r.title,
          name: r.name,
          code: r.code,
          specialityId: r.specialityId ?? null,
          specialityName,
        }
      })

    return { success: true, data }
  } catch (error: unknown) {
    console.error("getPublicDoctors error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch doctors"
    return {
      success: false,
      code: "server_error",
      message,
    }
  }
}
