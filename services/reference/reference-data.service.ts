import prisma from "@/lib/prisma"
import type { ReferenceSelectOption } from "@/types/reference"
import { formatReferenceLabel } from "@/types/reference"
import { formatUserDisplayName } from "@/lib/helpers/user-display.helper"

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

/** Users (for reports): active only, alphabetical by name, label "Name (STAFF_CODE)" when staff code exists. */
export async function getUsersForSelectService(): Promise<ReferenceSelectOption[]> {
  const records = await prisma.user.findMany({
    where: { status: 1 },
    orderBy: { name: "asc" },
    select: { id: true, name: true, staff: { select: { code: true } } },
    take: 500,
  })
  return records
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id,
      name: formatUserDisplayName(r.name, r.id, r.staff?.code),
      code: r.staff?.code ?? null,
    }))
}

/** Departments: published only, alphabetical by name. */
export async function getDepartmentsForSelectService(): Promise<ReferenceSelectOption[]> {
  const records = await prisma.department.findMany({
    where: { status: 1 },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  return records
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id,
      name: (r.name ?? "").trim(),
      code: null,
    }))
}

/** Specialities: published only, alphabetical by name, label "Name (CODE)". */
export async function getSpecialitiesForSelectService(): Promise<ReferenceSelectOption[]> {
  const records = await prisma.speciality.findMany({
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

const TAG_TYPE_AREA = 0 // City (old system type 0)
const TAG_STATUS_ACTIVE = 1

/** Areas (tag cities): active only, alphabetical by name. */
export async function getAreasForSelectService(): Promise<ReferenceSelectOption[]> {
  const records = await prisma.tag.findMany({
    where: { status: TAG_STATUS_ACTIVE, type: TAG_TYPE_AREA },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  return records
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id,
      name: (r.name ?? "").trim(),
      code: null,
    }))
}

/** Banks: active only, alphabetical by name. Derived from Tag records that are referenced by BankAccount.bankId. */
export async function getBanksForSelectService(): Promise<ReferenceSelectOption[]> {
  const records = await prisma.tag.findMany({
    where: {
      status: TAG_STATUS_ACTIVE,
      name: { not: null },
      bankAccounts: { some: {} },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
  return records
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id,
      name: (r.name ?? "").trim(),
      code: null,
    }))
}

const SEARCHABLE_THRESHOLD = 10

/** Use searchable dropdown when option count exceeds this. */
export function getSearchableThreshold(): number {
  return SEARCHABLE_THRESHOLD
}
