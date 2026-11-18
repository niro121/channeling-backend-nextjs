"use server"

import prisma from "@/lib/prisma"

export type SmsLogRecentItem = {
  id: string
  createdAt: Date
  status: number
  name: string
  description: string | null
  phone: string
  template: string
}

export type SmsLogRecentResult = {
  success: boolean
  data?: { items: SmsLogRecentItem[] }
  message?: string
}

const RECENT_PAGE_SIZE = 50
const FETCH_SIZE = 500

/** Normalize search term for case-insensitive match. */
function matchesSearch(item: SmsLogRecentItem, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  return (
    item.phone.toLowerCase().includes(q) ||
    item.name.toLowerCase().includes(q) ||
    (item.description ?? "").toLowerCase().includes(q) ||
    item.template.toLowerCase().includes(q)
  )
}

/**
 * Get the last 50 SMS log entries, optionally filtered by keyword or number.
 * Search matches phone, name, description, or message (template).
 */
export async function getSmsLogRecentService(
  search?: string | null
): Promise<SmsLogRecentResult> {
  try {
    const rows = await prisma.smsLog.findMany({
      orderBy: { createdAt: "desc" },
      take: search?.trim() ? FETCH_SIZE : RECENT_PAGE_SIZE,
      select: {
        id: true,
        createdAt: true,
        status: true,
        name: true,
        description: true,
        phone: true,
        template: true,
      },
    })

    const items: SmsLogRecentItem[] = rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      status: r.status,
      name: r.name,
      description: r.description,
      phone: r.phone,
      template: r.template,
    }))

    const filtered = search?.trim()
      ? items.filter((item) => matchesSearch(item, search)).slice(0, RECENT_PAGE_SIZE)
      : items

    return { success: true, data: { items: filtered } }
  } catch (e) {
    console.error("getSmsLogRecentService error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Failed to load SMS log.",
    }
  }
}
