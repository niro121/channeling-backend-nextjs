/** Max length for ManageRoster.code (matches Zod / Prisma convention). */
export const MANAGE_ROSTER_CODE_MAX_LENGTH = 12;

/**
 * Build a short uppercase roster code from name + department name.
 * Example: name "CHANNEL", dept "Nursing" → "NUR-CHANNEL" (truncated to 12).
 */
export function buildManageRosterCodeSuggestion(
  name: string,
  departmentName: string,
  maxLength = MANAGE_ROSTER_CODE_MAX_LENGTH
): string {
  const nameToken = toCodeToken(name);
  const deptToken = toCodeToken(departmentName);

  if (!nameToken && !deptToken) return '';

  let candidate: string;
  if (nameToken && deptToken) {
    const deptPart = deptToken.slice(0, 3);
    const nameBudget = Math.max(1, maxLength - deptPart.length - 1);
    candidate = `${deptPart}-${nameToken.slice(0, nameBudget)}`;
  } else {
    candidate = (nameToken || deptToken).slice(0, maxLength);
  }

  return candidate.slice(0, maxLength).toUpperCase();
}

/**
 * If `base` is already taken, append 2, 3, … until unique (within max length).
 */
export function uniquifyManageRosterCode(
  base: string,
  existingCodes: Iterable<string>,
  maxLength = MANAGE_ROSTER_CODE_MAX_LENGTH
): string {
  const normalizedBase = base.trim().toUpperCase().slice(0, maxLength);
  if (!normalizedBase) return '';

  const taken = new Set(
    [...existingCodes].map((code) => code.trim().toUpperCase()).filter(Boolean)
  );

  if (!taken.has(normalizedBase)) return normalizedBase;

  for (let n = 2; n < 1000; n += 1) {
    const suffix = String(n);
    const prefixLen = Math.max(1, maxLength - suffix.length);
    const candidate = `${normalizedBase.slice(0, prefixLen)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return normalizedBase;
}

function toCodeToken(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, MANAGE_ROSTER_CODE_MAX_LENGTH);
}
