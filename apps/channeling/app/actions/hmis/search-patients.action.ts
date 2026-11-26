"use server"

import { z } from "zod"
import { requirePermission } from "@/lib/server-permissions"
import { searchHmisPatientsService } from "@/services/hmis/search-patients.service"
import type { HmisPatientSearchServiceResult } from "@/types/hmis-patient"

const searchSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    identifier: z.string().optional(),
  })
  .refine(
    (d) => !!(d.name?.trim() || d.phone?.trim() || d.identifier?.trim()),
    { message: "Enter a name, phone, or identifier to search" }
  )

export type SearchHmisPatientsActionResult = HmisPatientSearchServiceResult

/**
 * Search HMIS FHIR patients. Requires channel-booking view.
 * API key stays server-side (HMIS_FHIR_* env).
 */
export async function searchHmisPatientsAction(
  raw: unknown
): Promise<SearchHmisPatientsActionResult> {
  try {
    await requirePermission("channel-booking", "view")
  } catch {
    return { success: false, message: "Permission denied" }
  }

  const parsed = searchSchema.safeParse(raw)
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ??
      "Enter a name, phone, or identifier to search"
    return { success: false, message: msg }
  }

  return searchHmisPatientsService(parsed.data)
}
