/** Normalize JSON field to string[] (MongoDB/Prisma sometimes returns array as object { "0": "id1", "1": "id2" }). */
export function normalizedIncludedIds(includedHandoverIds: string[] | null | unknown): string[] {
  if (Array.isArray(includedHandoverIds)) {
    return (includedHandoverIds as string[]).filter((id) => typeof id === "string" && id.trim() !== "")
  }
  if (includedHandoverIds != null && typeof includedHandoverIds === "object" && !Array.isArray(includedHandoverIds)) {
    const obj = includedHandoverIds as Record<string, unknown>
    const ids = Object.keys(obj)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => obj[k])
      .filter((id): id is string => typeof id === "string" && id.trim() !== "")
    if (ids.length > 0) return ids
  }
  return []
}
