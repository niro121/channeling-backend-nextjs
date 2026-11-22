/**
 * CORS headers for /api/public/careers/*.
 * Configure PUBLIC_CAREERS_CORS_ORIGINS (comma-separated) or leave unset for *.
 * Server-to-server BFFs can omit browser CORS needs.
 */
export function publicCareersCorsHeaders(): Record<string, string> {
  const configured =
    typeof process.env.PUBLIC_CAREERS_CORS_ORIGINS === 'string' &&
    process.env.PUBLIC_CAREERS_CORS_ORIGINS.trim()
      ? process.env.PUBLIC_CAREERS_CORS_ORIGINS.trim()
      : '*';

  // If multiple origins listed, reflect the first for Access-Control-Allow-Origin
  // (browsers allow only one). Prefer a single origin in production.
  const origin = configured.includes(',')
    ? configured.split(',')[0]!.trim()
    : configured;

  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

export function withPublicCareersCors(res: Response): Response {
  const headers = publicCareersCorsHeaders();
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}
