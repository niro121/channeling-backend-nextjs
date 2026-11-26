/**
 * CORS headers for /api/public/*. Configure PUBLIC_API_CORS_ORIGINS (comma-separated)
 * or leave unset to allow any origin (*). Server-to-server only: omit or skip adding these.
 */
export function publicApiCorsHeaders(): Record<string, string> {
  const origin =
    typeof process.env.PUBLIC_API_CORS_ORIGINS === "string" &&
    process.env.PUBLIC_API_CORS_ORIGINS.trim()
      ? process.env.PUBLIC_API_CORS_ORIGINS.trim()
      : "*"
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  }
}
