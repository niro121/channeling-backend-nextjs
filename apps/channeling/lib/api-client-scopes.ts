/**
 * Scopes an API client can be granted (ApiClient.scopes). Ticked in Admin → API clients.
 * Plain constants, safe to import from client components.
 */
export const API_CLIENT_SCOPES = [
  {
    id: "ayu:staff:read",
    label: "Read staff profiles for Ayu (name, contact, status; no NIC/address/HR data)",
  },
] as const

export type ApiClientScope = (typeof API_CLIENT_SCOPES)[number]["id"]

export const AYU_STAFF_READ_SCOPE: ApiClientScope = "ayu:staff:read"

const KNOWN = new Set<string>(API_CLIENT_SCOPES.map((s) => s.id))

/** Keep only known scopes, de-duplicated. */
export function normalizeApiClientScopes(scopes: unknown): ApiClientScope[] {
  if (!Array.isArray(scopes)) return []
  return [...new Set(scopes.filter((s): s is ApiClientScope => typeof s === "string" && KNOWN.has(s)))]
}
