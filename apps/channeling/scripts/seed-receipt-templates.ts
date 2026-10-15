/**
 * CLI entry point for seeding receipt templates.
 * Default: upsert defaults (dot-matrix + slip) without deleting existing templates.
 * Wipe:  npx tsx scripts/seed-receipt-templates.ts --wipe  (requires SEED_HELPER=true)
 *
 * Run: npx tsx scripts/seed-receipt-templates.ts
 * Or:  npm run seed:receipt-templates
 */

import "dotenv/config"
import {
  ensureDefaultReceiptTemplates,
  runSeedReceiptTemplates,
} from "@/services/seed/seed-receipt-templates.service"
import prisma from "@/lib/prisma"

async function main() {
  const wipe = process.argv.includes("--wipe")
  if (wipe) {
    console.log("Wiping and re-seeding receipt templates...\n")
  } else {
    console.log("Ensuring default receipt templates (dot-matrix + slip)...\n")
  }

  const result = wipe ? await runSeedReceiptTemplates() : await ensureDefaultReceiptTemplates()

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
