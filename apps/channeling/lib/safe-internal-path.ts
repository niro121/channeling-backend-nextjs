/** Same-origin relative path only. Rejects protocol-relative and external URLs. */
export function getSafeInternalPath(
  raw: string | string[] | null | undefined,
  fallback = "/welcome"
): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value || typeof value !== "string") return fallback
  let decoded = value
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return fallback
  }

  if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
    try {
      const url = new URL(decoded)
      decoded = `${url.pathname}${url.search}`
    } catch {
      return fallback
    }
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.startsWith("/\\")) {
    return fallback
  }
  if (decoded.includes("://") || decoded.toLowerCase().startsWith("/login")) {
    return fallback
  }
  return decoded
}

