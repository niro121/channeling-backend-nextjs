/**
 * Temporary script: backfill `order` and distinct `color` on all Location records.
 *
 * Run from apps/channeling:
 *   npx tsx scripts/backfill-location-order-color.ts
 *
 * Safe to re-run: overwrites order/color for every location.
 */

import "dotenv/config"
import prisma from "@/lib/prisma"

/** Distinct hex colors for branch UI (cycles if more locations than colors). */
const BRANCH_COLORS = [
  "#0f766e", // teal
  "#2563eb", // blue
  "#7c3aed", // violet
  "#db2777", // pink
  "#dc2626", // red
  "#ea580c", // orange
  "#ca8a04", // yellow
  "#16a34a", // green
  "#0891b2", // cyan
  "#4f46e5", // indigo
  "#9333ea", // purple
  "#be123c", // rose
  "#065f46", // emerald dark
  "#1d4ed8", // blue dark
  "#9a3412", // orange dark
  "#166534", // green dark
]

async function main() {
  console.log("Backfilling location order + colors...\n")

  const locations = await prisma.location.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      branchType: true,
      order: true,
      color: true,
    },
  })

  if (locations.length === 0) {
    console.log("No locations found.")
    return
  }

  // Main location (branchType 1) first, then by name
  const sorted = [...locations].sort((a, b) => {
    if (a.branchType !== b.branchType) return a.branchType - b.branchType
    return a.name.localeCompare(b.name)
  })

  console.log(`Updating ${sorted.length} locations:\n`)

  for (let i = 0; i < sorted.length; i++) {
    const loc = sorted[i]
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length]
    await prisma.location.update({
      where: { id: loc.id },
      data: {
        order: i,
        color,
        updatedAt: new Date(),
      },
    })
    console.log(
      `  [${String(i).padStart(2, "0")}] ${color}  ${loc.code.padEnd(6)}  ${loc.name}`
    )
  }

  console.log("\nDone.")
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
