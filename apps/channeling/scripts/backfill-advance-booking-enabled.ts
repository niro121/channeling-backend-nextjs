/**
 * Convert DoctorSession.advancedBookingDays (int) to advancedBookingEnabled (boolean).
 * Any days value > 0 becomes enabled; 0 / missing becomes disabled.
 * Then unsets the old advancedBookingDays field.
 *
 * Safe to re-run.
 *
 * Usage (from apps/channeling):
 *   Dry run (default):
 *     npx tsx scripts/backfill-advance-booking-enabled.ts
 *
 *   Apply:
 *     npx tsx scripts/backfill-advance-booking-enabled.ts --apply
 */

import "dotenv/config"
import prisma from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

const COLLECTION = "DoctorSession"

const DAYS_GT_ZERO = {
  $expr: {
    $gt: [
      {
        $convert: {
          input: "$advancedBookingDays",
          to: "double",
          onError: 0,
          onNull: 0,
        },
      },
      0,
    ],
  },
}

type CliArgs = { apply: boolean }

function parseArgs(argv: string[]): CliArgs {
  return { apply: argv.includes("--apply") }
}

function modifiedCount(result: unknown): number {
  if (!result || typeof result !== "object") return 0
  const row = result as { nModified?: number; n?: number }
  return Number(row.nModified ?? row.n ?? 0)
}

async function countDocs(query: Prisma.InputJsonObject): Promise<number> {
  const counted = await prisma.$runCommandRaw({
    count: COLLECTION,
    query,
  })
  return Number((counted as { n?: number })?.n ?? 0)
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2))
  console.log(
    apply
      ? "Applying advance-booking enabled backfill…"
      : "Dry run (pass --apply to write)"
  )

  const wouldEnable = await countDocs({
    ...DAYS_GT_ZERO,
    advancedBookingDays: { $exists: true },
  })
  const withOldField = await countDocs({
    advancedBookingDays: { $exists: true },
  })
  const missingEnabled = await countDocs({
    advancedBookingEnabled: { $exists: false },
  })

  console.log(`  advancedBookingDays > 0: ${wouldEnable} (enable)`)
  console.log(`  still have advancedBookingDays: ${withOldField}`)
  console.log(`  missing advancedBookingEnabled: ${missingEnabled}`)

  if (!apply) {
    console.log("Dry run complete. No documents written.")
    return
  }

  const enableResult = await prisma.$runCommandRaw({
    update: COLLECTION,
    updates: [
      {
        q: DAYS_GT_ZERO,
        u: {
          $set: { advancedBookingEnabled: true },
          $unset: { advancedBookingDays: "" },
        },
        multi: true,
      },
    ],
  })
  console.log(`  enabled (days > 0): updated ${modifiedCount(enableResult)}`)

  const disableOldFieldResult = await prisma.$runCommandRaw({
    update: COLLECTION,
    updates: [
      {
        q: { advancedBookingDays: { $exists: true } },
        u: {
          $set: { advancedBookingEnabled: false },
          $unset: { advancedBookingDays: "" },
        },
        multi: true,
      },
    ],
  })
  console.log(
    `  disabled + unset leftover days: updated ${modifiedCount(disableOldFieldResult)}`
  )

  const fillMissingResult = await prisma.$runCommandRaw({
    update: COLLECTION,
    updates: [
      {
        q: { advancedBookingEnabled: { $exists: false } },
        u: { $set: { advancedBookingEnabled: false } },
        multi: true,
      },
    ],
  })
  console.log(
    `  defaulted missing enabled flag: updated ${modifiedCount(fillMissingResult)}`
  )

  console.log("Done.")
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
