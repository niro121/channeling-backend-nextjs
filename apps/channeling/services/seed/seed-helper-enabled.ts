/**
 * Seed services (receipt templates, accounting accounts) may only run when
 * SEED_HELPER is explicitly enabled in .env (e.g. SEED_HELPER=true or SEED_HELPER=1).
 * This prevents accidental execution in production or staging.
 */

const SEED_HELPER_RAW = process.env.SEED_HELPER ?? ""

export function isSeedHelperEnabled(): boolean {
  const v = String(SEED_HELPER_RAW).trim().toLowerCase()
  return v === "true" || v === "1"
}

export const SEED_HELPER_DISABLED_MESSAGE =
  "Seed helper is disabled. Set SEED_HELPER=true (or SEED_HELPER=1) in .env to allow running seeds from the app."
