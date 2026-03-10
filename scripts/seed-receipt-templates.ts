/**
 * CLI entry point for seeding receipt templates.
 * All logic lives in services/seed/seed-receipt-templates.service.ts (used by this script and by /admin/seed).
 *
 * Run: npx tsx scripts/seed-receipt-templates.ts
 * Or:  npm run seed:receipt-templates
 *
 * Requires SEED_HELPER=true (or SEED_HELPER=1) in .env.
 */

import "dotenv/config"
import { runSeedReceiptTemplates } from "@/services/seed/seed-receipt-templates.service"
import prisma from "@/lib/prisma"

async function main() {
  console.log("Seeding receipt templates (remove all, then re-add)...\n")

  const result = await runSeedReceiptTemplates()

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
