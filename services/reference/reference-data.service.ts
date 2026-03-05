import prisma from "@/lib/prisma"
import type { ReferenceSelectOption } from "@/types/reference"
import { formatReferenceLabel } from "@/types/reference"

/** Agencies: alphabetical by name, label "Name (CODE)". */
export async function getAgenciesForSelectService(): Promise<ReferenceSelectOption[]> {
  const records = await prisma.agency.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  })
  return records
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id,
      name: formatReferenceLabel(r.name, r.code),
      code: r.code ?? null,
    }))
}

/** Locations (branches): published only, alphabetical by name, label "Name (CODE)". */
export async function getLocationsForSelectService(): Promise<ReferenceSelectOption[]> {
  const records = await prisma.location.findMany({
    where: { status: 1 },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  })
  return records
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id,
      name: formatReferenceLabel(r.name, r.code),
      code: r.code ?? null,
    }))
}

/** Doctors: published only, alphabetical by name, label "Name (CODE)" (title + name as name). */
export async function getDoctorsForSelectService(): Promise<ReferenceSelectOption[]> {
  const records = await prisma.doctor.findMany({
    where: { status: 1 },
    orderBy: { name: "asc" },
    select: { id: true, title: true, name: true, code: true },
  })
  return records
    .filter((r) => r.id)
    .map((r) => {
      const fullName = [r.title, r.name].filter(Boolean).join(" ").trim()
      return {
        id: r.id,
        name: formatReferenceLabel(fullName, r.code),
        code: r.code ?? null,
      }
    })
}

/** Staff: active only, alphabetical by name, label "Name (CODE)". */
export async function getStaffForSelectService(): Promise<ReferenceSelectOption[]> {
  const records = await prisma.staff.findMany({
    where: { status: 1 },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  })
  return records
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id,
      name: formatReferenceLabel(r.name ?? "", r.code),
      code: r.code ?? null,
    }))
}

const SEARCHABLE_THRESHOLD = 10

/** Use searchable dropdown when option count exceeds this. */
export function getSearchableThreshold(): number {
  return SEARCHABLE_THRESHOLD
}
