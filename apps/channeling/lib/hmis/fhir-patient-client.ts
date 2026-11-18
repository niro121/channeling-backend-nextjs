const DEFAULT_TIMEOUT_MS = 15_000

export class HmisFhirError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message)
    this.name = "HmisFhirError"
  }
}

export function getHmisFhirConfig(): {
  baseUrl: string
  apiKey: string
} | null {
  const baseUrl = process.env.HMIS_FHIR_BASE_URL?.trim().replace(/\/$/, "")
  const apiKey = process.env.HMIS_FHIR_API_KEY?.trim()
  if (!baseUrl || !apiKey) return null
  return { baseUrl, apiKey }
}

type SearchQuery = {
  name?: string
  phone?: string
  identifier?: string
}

/**
 * GET /api/fhir/Patient with FHIR API key header.
 * Returns raw JSON (Bundle or error payload).
 */
export async function searchHmisFhirPatients(
  query: SearchQuery
): Promise<unknown> {
  const config = getHmisFhirConfig()
  if (!config) {
    throw new HmisFhirError("HMIS not configured (HMIS_FHIR_BASE_URL / HMIS_FHIR_API_KEY)")
  }

  const params = new URLSearchParams()
  if (query.name?.trim()) params.set("name", query.name.trim())
  if (query.phone?.trim()) params.set("phone", query.phone.trim())
  if (query.identifier?.trim()) params.set("identifier", query.identifier.trim())

  if (![...params.keys()].length) {
    throw new HmisFhirError("At least one search parameter is required", 400)
  }

  const url = `${config.baseUrl}/api/fhir/Patient?${params.toString()}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        FHIR: config.apiKey,
        Accept: "application/fhir+json",
      },
      signal: controller.signal,
      cache: "no-store",
    })

    const body: unknown = await res.json().catch(() => null)

    if (!res.ok) {
      const message =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof (body as { message: unknown }).message === "string"
          ? (body as { message: string }).message
          : `HMIS FHIR request failed (${res.status})`
      throw new HmisFhirError(message, res.status)
    }

    return body
  } catch (err) {
    if (err instanceof HmisFhirError) throw err
    if (err instanceof Error && err.name === "AbortError") {
      throw new HmisFhirError("HMIS FHIR request timed out")
    }
    throw new HmisFhirError(
      err instanceof Error ? err.message : "HMIS FHIR request failed"
    )
  } finally {
    clearTimeout(timeout)
  }
}
