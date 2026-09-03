/**
 * Backfill missing handover (CSIN) and float (FLT) document numbers.
 *
 * Numbers are assigned per location, oldest first, continuing the existing
 * sequence so already-numbered documents are not changed.
 *
 * Usage (from apps/channeling):
 *   Dry run (default):
 *     npx tsx scripts/backfill-handover-float-numbers.ts
 *
 *   Apply:
 *     npx tsx scripts/backfill-handover-float-numbers.ts --apply
 */

import "dotenv/config"
import prisma from "@/lib/prisma"
import { getHandoverSequenceInfo } from "@/services/shift-handover-sequence"
import { getFloatSequenceInfo } from "@/services/float-request-sequence"

type CliArgs = { apply: boolean }

function parseArgs(argv: string[]): CliArgs {
  return { apply: argv.includes("--apply") }
}

function missingNumber(value: string | null | undefined): boolean {
  return !value || value.trim() === ""
}

async function peekNextValue(scopeKey: string): Promise<number> {
  const seq = await prisma.sequence.findUnique({
    where: { scopeKey },
    select: { lastValue: true },
  })
  const last = seq?.lastValue ?? 0
  return last < 1 ? 1 : last + 1
}

/** Reserve `count` numbers in one write and return the first number in the range. */
async function reserveRange(scopeKey: string, count: number): Promise<number> {
  const first = await peekNextValue(scopeKey)
  const lastValue = first + count - 1
  await prisma.sequence.upsert({
    where: { scopeKey },
    create: { scopeKey, lastValue },
    update: { lastValue },
  })
  return first
}

async function backfillHandovers(apply: boolean): Promise<number> {
  const rows = await prisma.shiftHandover.findMany({
    select: {
      id: true,
      createdAt: true,
      handoverNoString: true,
      shift: { select: { locationId: true, location: { select: { code: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  })

  const missing = rows.filter((row) => missingNumber(row.handoverNoString))
  console.log(`Handovers: ${rows.length} total, ${missing.length} missing a number`)
  if (missing.length === 0) return 0

  const byLocation = new Map<string | null, typeof missing>()
  for (const row of missing) {
    const locationId = row.shift?.locationId ?? null
    const list = byLocation.get(locationId) ?? []
    list.push(row)
    byLocation.set(locationId, list)
  }

  let assigned = 0
  for (const [locationId, list] of byLocation) {
    const info = await getHandoverSequenceInfo(locationId)
    let next = await peekNextValue(info.scopeKey)
    const label = locationId
      ? `${list[0]?.shift?.location?.code ?? "LOC"} (${list[0]?.shift?.location?.name ?? locationId})`
      : "no location (CSIN/ global)"
    console.log(`  ${label}: ${list.length} to number, next would be ${info.formatHandoverNoString(next)}`)

    if (!apply) {
      assigned += list.length
      continue
    }

    let n = await reserveRange(info.scopeKey, list.length)
    for (const row of list) {
      await prisma.shiftHandover.update({
        where: { id: row.id },
        data: {
          handoverNo: n,
          handoverNoString: info.formatHandoverNoString(n),
        },
      })
      assigned += 1
      n += 1
    }
  }

  return assigned
}

async function backfillFloats(apply: boolean): Promise<number> {
  const rows = await prisma.floatRequest.findMany({
    select: {
      id: true,
      createdAt: true,
      floatNoString: true,
      shift: { select: { locationId: true, location: { select: { code: true, name: true } } } },
      toTill: { select: { locationId: true, location: { select: { code: true, name: true } } } },
      requestedBy: { select: { userLocationId: true, userLocation: { select: { code: true, name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  })

  const missing = rows.filter((row) => missingNumber(row.floatNoString))
  console.log(`Floats: ${rows.length} total, ${missing.length} missing a number`)
  if (missing.length === 0) return 0

  type LocMeta = { code: string | null; name: string | null }
  const byLocation = new Map<string | null, { rows: typeof missing; meta: LocMeta }>()
  for (const row of missing) {
    const locationId =
      row.shift?.locationId ?? row.toTill?.locationId ?? row.requestedBy?.userLocationId ?? null
    const meta: LocMeta = {
      code:
        row.shift?.location?.code ??
        row.toTill?.location?.code ??
        row.requestedBy?.userLocation?.code ??
        null,
      name:
        row.shift?.location?.name ??
        row.toTill?.location?.name ??
        row.requestedBy?.userLocation?.name ??
        null,
    }
    const bucket = byLocation.get(locationId) ?? { rows: [], meta }
    bucket.rows.push(row)
    byLocation.set(locationId, bucket)
  }

  let assigned = 0
  for (const [locationId, bucket] of byLocation) {
    const info = await getFloatSequenceInfo(locationId)
    let next = await peekNextValue(info.scopeKey)
    const label = locationId
      ? `${bucket.meta.code ?? "LOC"} (${bucket.meta.name ?? locationId})`
      : "no location (FLT/ global)"
    console.log(`  ${label}: ${bucket.rows.length} to number, next would be ${info.formatFloatNoString(next)}`)

    if (!apply) {
      assigned += bucket.rows.length
      continue
    }

    let n = await reserveRange(info.scopeKey, bucket.rows.length)
    for (const row of bucket.rows) {
      await prisma.floatRequest.update({
        where: { id: row.id },
        data: {
          floatNo: n,
          floatNoString: info.formatFloatNoString(n),
        },
      })
      assigned += 1
      n += 1
    }
  }

  return assigned
}

async function main(): Promise<void> {
  const { apply } = parseArgs(process.argv.slice(2))
  console.log(apply ? "Applying backfill…" : "Dry run (pass --apply to write).")
  console.log("")

  const handovers = await backfillHandovers(apply)
  const floats = await backfillFloats(apply)

  console.log("")
  console.log(
    apply
      ? `Done. Numbered ${handovers} handover(s) and ${floats} float request(s).`
      : `Would number ${handovers} handover(s) and ${floats} float request(s). Re-run with --apply to write.`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
