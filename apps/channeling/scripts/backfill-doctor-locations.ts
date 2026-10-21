/**
 * Copy branch links onto doctors who have none yet, using locations
 * already stored on their sessions (arrived or not).
 *
 * Usage (from apps/channeling):
 *   Dry run:
 *     npx tsx scripts/backfill-doctor-locations.ts
 *
 *   Apply:
 *     npx tsx scripts/backfill-doctor-locations.ts --apply
 *
 * Doctors who already have DoctorLocation rows are left unchanged.
 * Doctors with no sessions stay untagged (available at every branch).
 */

import "dotenv/config"
import prisma from "@/lib/prisma"

type CliArgs = {
  apply: boolean
}

function printUsage(): void {
  console.log(`Usage:
  npx tsx scripts/backfill-doctor-locations.ts [--apply]

  Without --apply, only reports DoctorLocation rows that would be inserted.
  Source: distinct Session.locationId per Session.doctorId.
  Skips doctors who already have at least one location link.`)
}

function parseArgs(argv: string[]): CliArgs {
  let apply = false

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true
      continue
    }
    if (arg === "--help" || arg === "-h") {
      printUsage()
      process.exit(0)
    }
    throw new Error(`Unknown argument "${arg}".`)
  }

  return { apply }
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2))

  console.log(`[backfill-doctor-locations] mode=${apply ? "APPLY" : "DRY RUN"}`)

  const [sessionPairs, existingLinks, locations] = await Promise.all([
    prisma.session.groupBy({
      by: ["doctorId", "locationId"],
      where: {
        doctorId: { not: null },
        locationId: { not: null },
      },
    }),
    prisma.doctorLocation.findMany({
      select: { doctorId: true },
    }),
    prisma.location.findMany({
      select: { id: true, name: true },
    }),
  ])

  const alreadyTagged = new Set(existingLinks.map((row) => row.doctorId))
  const locationNameById = new Map(locations.map((row) => [row.id, row.name]))

  const locationIdsByDoctor = new Map<string, Set<string>>()
  let skippedUnknownLocation = 0

  for (const pair of sessionPairs) {
    if (!pair.doctorId || !pair.locationId) continue
    if (alreadyTagged.has(pair.doctorId)) continue
    if (!locationNameById.has(pair.locationId)) {
      skippedUnknownLocation += 1
      console.log(
        `  SKIP  doctor=${pair.doctorId}  location=${pair.locationId}  (location not found)`
      )
      continue
    }
    const existing = locationIdsByDoctor.get(pair.doctorId)
    if (existing) existing.add(pair.locationId)
    else locationIdsByDoctor.set(pair.doctorId, new Set([pair.locationId]))
  }

  const doctorIds = [...locationIdsByDoctor.keys()]
  if (doctorIds.length === 0) {
    console.log("No untagged doctors with session locations to copy.")
    console.log(
      `Summary: 0 doctor(s), 0 link(s). ${alreadyTagged.size} doctor(s) already tagged and left unchanged. ${skippedUnknownLocation} unknown location pair(s) skipped.`
    )
    return
  }

  const doctors = await prisma.doctor.findMany({
    where: { id: { in: doctorIds } },
    select: { id: true, code: true, title: true, name: true },
    orderBy: { name: "asc" },
  })

  const doctorById = new Map(doctors.map((doctor) => [doctor.id, doctor]))
  const rows: { doctorId: string; locationId: string }[] = []

  for (const doctorId of doctorIds) {
    const doctor = doctorById.get(doctorId)
    if (!doctor) {
      console.log(`  SKIP  doctor=${doctorId}  (doctor not found)`)
      locationIdsByDoctor.delete(doctorId)
      continue
    }

    const locationIds = [...(locationIdsByDoctor.get(doctorId) ?? [])].sort()
    const locationLabels = locationIds
      .map((locationId) => `${locationNameById.get(locationId) ?? locationId} (${locationId})`)
      .join(", ")

    console.log(
      `  ${apply ? "INSERT" : "WOULD"}  ${doctor.title} ${doctor.name} (${doctor.code})  -> ${locationLabels}`
    )

    for (const locationId of locationIds) {
      rows.push({ doctorId, locationId })
    }
  }

  if (apply && rows.length > 0) {
    await prisma.doctorLocation.createMany({
      data: rows,
    })
  }

  console.log("")
  console.log(
    `Summary: ${locationIdsByDoctor.size} doctor(s), ${rows.length} link(s) ${apply ? "inserted" : "would be inserted"}. ${alreadyTagged.size} doctor(s) already tagged and left unchanged. ${skippedUnknownLocation} unknown location pair(s) skipped.`
  )
  if (!apply && rows.length > 0) {
    console.log("Re-run with --apply to write changes.")
  }
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
