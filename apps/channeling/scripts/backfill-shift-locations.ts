/**
 * Set locationId on shifts that were started without a location,
 * using each user's default profile location (userLocationId).
 *
 * Usage (from apps/channeling):
 *   Dry run (all open shifts missing location):
 *     npx tsx scripts/backfill-shift-locations.ts
 *
 *   Dry run for one user:
 *     npx tsx scripts/backfill-shift-locations.ts --user 30050
 *
 *   Apply:
 *     npx tsx scripts/backfill-shift-locations.ts --apply
 *
 *   Include ended shifts too (historical):
 *     npx tsx scripts/backfill-shift-locations.ts --all --apply
 *
 * --user accepts user id, email, username, or staff code.
 */

import "dotenv/config"
import prisma from "@/lib/prisma"
import { formatUserDisplayName } from "@/lib/helpers/user-display.helper"
import { SHIFT_STATUS } from "@/types/shift"

const OPEN_SHIFT_STATUSES = [
  SHIFT_STATUS.ACTIVE,
  SHIFT_STATUS.PAUSED,
  SHIFT_STATUS.HANDOVER_PENDING,
] as const

const SHIFT_STATUS_LABEL: Record<number, string> = {
  [SHIFT_STATUS.PAUSED]: "PAUSED",
  [SHIFT_STATUS.ACTIVE]: "ACTIVE",
  [SHIFT_STATUS.HANDOVER_PENDING]: "HANDOVER_PENDING",
  [SHIFT_STATUS.ENDED]: "ENDED",
}

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/

type CliArgs = {
  userQuery: string | null
  apply: boolean
  allStatuses: boolean
}

type ResolvedUser = {
  id: string
  name: string
  email: string
  username: string | null
  staff: { code: string } | null
}

function printUsage(): void {
  console.log(`Usage:
  npx tsx scripts/backfill-shift-locations.ts [--user <id|email|username|staffCode>] [--apply] [--all]

  Without --apply, only reports changes.
  Default scope: open shifts (ACTIVE, PAUSED, HANDOVER_PENDING) with locationId = null.
  --all includes ended shifts as well.
  --user limits to one user's shifts.`)
}

function parseArgs(argv: string[]): CliArgs {
  let userQuery: string | null = null
  let apply = false
  let allStatuses = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--apply") {
      apply = true
      continue
    }
    if (arg === "--all") {
      allStatuses = true
      continue
    }
    if (arg === "--user" || arg === "-u") {
      userQuery = argv[i + 1]?.trim() || null
      i += 1
      continue
    }
    if (arg.startsWith("--user=")) {
      userQuery = arg.slice("--user=".length).trim() || null
      continue
    }
    if (!arg.startsWith("-") && userQuery == null) {
      userQuery = arg.trim()
    }
  }

  return { userQuery, apply, allStatuses }
}

async function resolveUser(query: string): Promise<ResolvedUser> {
  const select = {
    id: true,
    name: true,
    email: true,
    username: true,
    staff: { select: { code: true } },
  } as const

  if (OBJECT_ID_RE.test(query)) {
    const byId = await prisma.user.findUnique({ where: { id: query }, select })
    if (byId) return byId
  }

  const byEmail = await prisma.user.findUnique({ where: { email: query }, select })
  if (byEmail) return byEmail

  const byUsername = await prisma.user.findFirst({ where: { username: query }, select })
  if (byUsername) return byUsername

  const staff = await prisma.staff.findUnique({
    where: { code: query },
    select: { users: { select, take: 2 } },
  })
  if (staff?.users.length === 1 && staff.users[0]) return staff.users[0]
  if (staff && staff.users.length > 1) {
    throw new Error(
      `Staff code "${query}" is linked to multiple users:\n${staff.users
        .map((u) => `  ${u.id}  ${formatUserDisplayName(u.name, u.id, u.staff?.code)}  ${u.email}`)
        .join("\n")}`
    )
  }

  throw new Error(`No user found for "${query}". Try id, email, username, or staff code.`)
}

async function resolveDefaultLocationId(userId: string): Promise<{ locationId: string; locationName: string } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userLocationId: true,
      userLocation: { select: { id: true, name: true } },
      bookingLocations: { select: { locationId: true, location: { select: { id: true, name: true } } } },
    },
  })
  if (!user) return null

  if (user.userLocationId && user.userLocation) {
    return { locationId: user.userLocation.id, locationName: user.userLocation.name }
  }

  const firstBooking = user.bookingLocations.find((row) => row.locationId && row.location)
  if (firstBooking?.location) {
    return { locationId: firstBooking.location.id, locationName: firstBooking.location.name }
  }

  return null
}

async function main() {
  const { userQuery, apply, allStatuses } = parseArgs(process.argv.slice(2))

  let filterUserId: string | null = null
  if (userQuery) {
    const user = await resolveUser(userQuery)
    filterUserId = user.id
    console.log(
      `[backfill-shift-locations] scoped to user ${formatUserDisplayName(user.name, user.id, user.staff?.code)} (${user.id})`
    )
  }

  console.log(`[backfill-shift-locations] mode=${apply ? "APPLY" : "DRY RUN"}`)
  console.log(`  scope=${allStatuses ? "all statuses" : "open shifts only"}`)

  const shifts = await prisma.shift.findMany({
    where: {
      locationId: null,
      ...(filterUserId ? { userId: filterUserId } : {}),
      ...(allStatuses ? {} : { status: { in: [...OPEN_SHIFT_STATUSES] } }),
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      userId: true,
      status: true,
      startedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          staff: { select: { code: true } },
        },
      },
    },
  })

  if (shifts.length === 0) {
    console.log("No shifts with missing location found for this scope.")
    return
  }

  let wouldUpdate = 0
  let skippedNoLocation = 0

  for (const shift of shifts) {
    const defaultLoc = await resolveDefaultLocationId(shift.userId)
    const userLabel = formatUserDisplayName(
      shift.user.name,
      shift.user.id,
      shift.user.staff?.code ?? null
    )
    const statusLabel = SHIFT_STATUS_LABEL[Number(shift.status)] ?? String(shift.status)

    if (!defaultLoc) {
      skippedNoLocation += 1
      console.log(
        `  SKIP  shift=${shift.id}  user=${userLabel}  status=${statusLabel}  started=${shift.startedAt.toISOString()}  (user has no default/booking location)`
      )
      continue
    }

    wouldUpdate += 1
    console.log(
      `  ${apply ? "UPDATE" : "WOULD"}  shift=${shift.id}  user=${userLabel}${shift.user.username ? ` (${shift.user.username})` : ""}  status=${statusLabel}  started=${shift.startedAt.toISOString()}  -> location=${defaultLoc.locationName} (${defaultLoc.locationId})`
    )

    if (apply) {
      await prisma.shift.update({
        where: { id: shift.id },
        data: { locationId: defaultLoc.locationId, updatedAt: new Date() },
      })
    }
  }

  console.log("")
  console.log(`Summary: ${wouldUpdate} shift(s) ${apply ? "updated" : "would be updated"}, ${skippedNoLocation} skipped (no user location).`)
  if (!apply && wouldUpdate > 0) {
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
