/**
 * CLI entry point for seeding accounting accounts.
 * All logic lives in services/seed/seed-accounting-accounts.service.ts (used by this script and by /admin/seed).
 *
 * Run: npx tsx scripts/seed-accounting-accounts.ts
 * Optional: pass a doctor code to create only that doctor's payable account (e.g. DR0478).
 *   npx tsx scripts/seed-accounting-accounts.ts DR0478
 *   Or set env: DOCTOR_CODE=DR0478
 *
 * Requires SEED_HELPER=true (or SEED_HELPER=1) in .env.
 */

import "dotenv/config"
import { runSeedAccountingAccounts } from "@/services/seed/seed-accounting-accounts.service"
import prisma from "@/lib/prisma"

const doctorCodeFilter =
  process.argv[2]?.trim() || process.env.DOCTOR_CODE?.trim() || null

async function main() {
  console.log("Seeding accounting accounts...\n")
  if (doctorCodeFilter) {
    console.log(`Doctor filter: only code "${doctorCodeFilter}"\n`)
  }

  const result = await runSeedAccountingAccounts(doctorCodeFilter)

  if (result.success) {
    console.log(result.details)
    console.log("\nDone.")
  } else {
    console.error(result.message)
    process.exit(1)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
