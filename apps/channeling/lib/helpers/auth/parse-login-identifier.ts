/** Login identifier from JSON body: `email` or `username` (either may be email or username value). */
export function parseLoginIdentifier(body: {
  email?: string
  username?: string
}): string {
  if (typeof body?.email === "string" && body.email.trim()) {
    return body.email.trim()
  }
  if (typeof body?.username === "string" && body.username.trim()) {
    return body.username.trim()
  }
  return ""
}

/** Match stored email or username without regard to letter case. Password stays case-sensitive. */
export function loginIdentifierOr(identifier: string) {
  const value = identifier.trim()
  return [
    { email: { equals: value, mode: "insensitive" as const } },
    { username: { equals: value, mode: "insensitive" as const } },
  ]
}
