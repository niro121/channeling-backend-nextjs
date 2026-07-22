"use server"

import prisma from "@/lib/prisma"

export type AgencyBookLeafStatus = {
  leaf: string
  leafNum: number
  used: boolean
}

export type AgencyBookLeafUsage = {
  bookId: string
  bookNumber: string
  startNumber: string
  endNumber: string
  usedCount: number
  unusedCount: number
  leaves: AgencyBookLeafStatus[]
}

function padLeaf(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * List used vs unused leaf numbers for an agency book (within start–end range).
 * A leaf is used when an active booking (status 0/1) has agencyRef = bookNumber + leaf.
 */
export async function getAgencyBookLeafUsageService(
  agencyId: string,
  agencyBookId: string
): Promise<{
  success: boolean
  data?: AgencyBookLeafUsage
  message?: string
}> {
  try {
    if (!agencyId?.trim() || !agencyBookId?.trim()) {
      return { success: false, message: "Agency and book are required." }
    }

    const book = await prisma.agencyBook.findFirst({
      where: {
        id: agencyBookId,
        agencyId,
        status: 1,
      },
      select: {
        id: true,
        bookNumber: true,
        startNumber: true,
        endNumber: true,
      },
    })

    if (!book) {
      return { success: false, message: "Agency book not found." }
    }

    const start = parseInt(String(book.startNumber).replace(/\D/g, ""), 10)
    const end = parseInt(String(book.endNumber).replace(/\D/g, ""), 10)
    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
      return {
        success: false,
        message: "Book start/end numbers are invalid.",
      }
    }

    const prefix = book.bookNumber
    const bookings = await prisma.booking.findMany({
      where: {
        agencyId,
        status: { in: [0, 1] },
        agencyRef: { startsWith: prefix },
      },
      select: { agencyRef: true },
    })

    const used = new Set<number>()
    for (const b of bookings) {
      const ref = (b.agencyRef ?? "").trim()
      if (ref.length !== prefix.length + 2) continue
      if (!ref.startsWith(prefix)) continue
      const leaf = ref.slice(-2)
      if (ref !== `${prefix}${leaf}`) continue
      const n = parseInt(leaf, 10)
      if (!Number.isNaN(n) && n >= start && n <= end) used.add(n)
    }

    const leaves: AgencyBookLeafStatus[] = []
    for (let n = start; n <= end; n++) {
      leaves.push({
        leaf: padLeaf(n),
        leafNum: n,
        used: used.has(n),
      })
    }

    const usedCount = leaves.filter((l) => l.used).length

    return {
      success: true,
      data: {
        bookId: book.id,
        bookNumber: book.bookNumber,
        startNumber: book.startNumber,
        endNumber: book.endNumber,
        usedCount,
        unusedCount: leaves.length - usedCount,
        leaves,
      },
    }
  } catch (error: unknown) {
    console.error("getAgencyBookLeafUsageService error", error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to load book leaf usage.",
    }
  }
}
