/**
 * Standard option shape for reference dropdowns (agencies, locations, doctors, staff).
 * Always sorted alphabetically by name; display label is "Name (CODE)" when code exists.
 */
export type ReferenceSelectOption = {
  id: string
  name: string
  code?: string | null
  /** Present on doctor options so UIs can filter consultants by speciality. */
  specialityId?: string | null
}

/** Build display label: "Name (CODE)" when code exists, else name. */
export function formatReferenceLabel(name: string, code?: string | null): string {
  const n = (name ?? "").trim()
  const c = code != null && String(code).trim() !== "" ? String(code).trim() : null
  return c ? `${n} (${c})` : n
}
