/**
 * Shared title list and helpers for doctor, patient, channel booking, etc.
 */

export type TitleItem = {
  id: number
  name: string
  sex: string
}

export const TITLE_LIST: TitleItem[] = [
  { id: 0, name: "MR.", sex: "Male" },
  { id: 1, name: "MRS.", sex: "Female" },
  { id: 2, name: "MISS.", sex: "Female" },
  { id: 3, name: "MS.", sex: "Female" },
  { id: 4, name: "Ma'am", sex: "Female" },
  { id: 5, name: "DR.", sex: "Male" },
  { id: 6, name: "DR.(MRS)", sex: "Female" },
  { id: 7, name: "DR.(MS)", sex: "Female" },
  { id: 8, name: "DR.(MISS)", sex: "Female" },
  { id: 9, name: "PROF.", sex: "Male" },
  { id: 10, name: "PROF.(MRS)", sex: "Female" },
  { id: 11, name: "MASTER.", sex: "Male" },
  { id: 12, name: "BABY.", sex: "Male" },
  { id: 14, name: "REV.", sex: "Male" },
  { id: 15, name: "RT.REV.", sex: "Male" },
  { id: 16, name: "HON.", sex: "Male" },
  { id: 17, name: "RT.HON.", sex: "Male" },
  { id: 18, name: "OTHER", sex: "Other" },
  { id: 19, name: "BABY OF", sex: "Other" },
]

/** Options for title dropdown when storing by name (e.g. doctor, channel booking). */
export const TITLE_OPTIONS: { id: string; name: string }[] = TITLE_LIST.map(
  (t) => ({ id: t.name, name: t.name })
)

export function getSexForTitle(titleName: string): string | null {
  const item = TITLE_LIST.find((t) => t.name === titleName)
  return item?.sex ?? null
}

export function normalizeTitleForSelect(
  title: string | null | undefined
): string {
  if (!title || !title.trim()) return ""
  const exact = TITLE_LIST.find((t) => t.name === title)
  if (exact) return exact.name
  const lower = title.trim().toLowerCase()
  const match = TITLE_LIST.find((t) => t.name.toLowerCase() === lower)
  return match?.name ?? title.trim()
}

export function getTitleNameById(
  titleId: number | string | null | undefined
): string | null {
  if (titleId === null || titleId === undefined) return null
  const id =
    typeof titleId === "string" ? parseInt(titleId, 10) : titleId
  if (Number.isNaN(id)) return null
  const item = TITLE_LIST.find((t) => t.id === id)
  return item?.name ?? null
}
