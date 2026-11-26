import { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

/** Public API area DTO for booking / third-party area dropdowns. */
export type PublicAreaDto = {
  id: string
  name: string
}

export type GetPublicAreasResult =
  | { success: true; data: PublicAreaDto[] }
  | {
      success: false
      code: "server_error"
      message: string
    }

const TAG_TYPE_AREA = 0 // City (old system type 0)
const TAG_STATUS_ACTIVE = 1

/**
 * Active area tags (cities) for Public API consumers.
 * Optional keyword filters by name. Use `name` when posting bookings (`area` field).
 */
export async function getPublicAreas(
  keyword?: string | null
): Promise<GetPublicAreasResult> {
  try {
    const trimmedKeyword = keyword?.trim()

    const where: Prisma.TagWhereInput = {
      status: TAG_STATUS_ACTIVE,
      type: TAG_TYPE_AREA,
      ...(trimmedKeyword
        ? {
            name: {
              contains: trimmedKeyword,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    }

    const records = await prisma.tag.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    })

    const data: PublicAreaDto[] = records
      .filter((r) => r.id && (r.name ?? "").trim())
      .map((r) => ({
        id: r.id,
        name: (r.name ?? "").trim(),
      }))

    return { success: true, data }
  } catch (error: unknown) {
    console.error("getPublicAreas error", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch areas"
    return {
      success: false,
      code: "server_error",
      message,
    }
  }
}
