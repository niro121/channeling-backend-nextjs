/**
 * End all open shifts (ACTIVE, PAUSED, HANDOVER_PENDING) for one user.
 *
 * This does not transfer till funds. Pending outgoing handovers on those shifts
 * are cancelled so the user is not left stuck in handover-pending.
 *
 * Usage (from apps/channeling):
 *   Dry run (default):
 *     npx tsx scripts/end-user-open-shifts.ts --user jane@example.com
 *
 *   Apply:
 *     npx tsx scripts/end-user-open-shifts.ts --user jane@example.com --apply
 *
 *   Apply even if the till still has a balance:
 *     npx tsx scripts/end-user-open-shifts.ts --user jane@example.com --apply --force
 *
 * --user accepts user id, email, username, or staff code.
 */

import "dotenv/config"
import prisma from "@/lib/prisma"
import { logActivity } from "@/lib/activity-log"
import { formatUserDisplayName } from "@/lib/helpers/user-display.helper"
import { SHIFT_STATUS } from "@/types/shift"
import { HANDOVER_STATUS } from "@/types/handover"
import { FLOAT_REQUEST_STATUS } from "@/types/float-request"
import { netEffectForAccountType } from "@/lib/accounting/helpers"

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
  force: boolean
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
  npx tsx scripts/end-user-open-shifts.ts --user <id|email|username|staffCode> [--apply] [--force]

  --user    Required. User id, email, username, or staff code.
  --apply   Write changes. Without this flag the script only reports what it would do.
  --force   Required together with --apply when the till still has a non-zero balance.
            This script does not hand over or zero the till.`)
}

function parseArgs(argv: string[]): CliArgs {
  let userQuery: string | null = null
  let apply = false
  let force = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--apply") {
      apply = true
      continue
    }
    if (arg === "--force") {
      force = true
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

  return { userQuery, apply, force }
}

function formatCents(cents: number): string {
  return `${(cents / 100).toFixed(2)} LKR`
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

  const byUsername = await prisma.user.findFirst({
    where: { username: query },
    select,
  })
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

  const nameMatches = await prisma.user.findMany({
    where: { name: { equals: query, mode: "insensitive" } },
    select,
    take: 10,
  })
  if (nameMatches.length === 1 && nameMatches[0]) return nameMatches[0]
  if (nameMatches.length > 1) {
    throw new Error(
      `Multiple users named "${query}":\n${nameMatches
        .map((u) => `  ${u.id}  ${formatUserDisplayName(u.name, u.id, u.staff?.code)}  ${u.email}`)
        .join("\n")}\nPass --user with an id, email, username, or staff code.`
    )
  }

  throw new Error(`No user found for "${query}". Try id, email, username, or staff code.`)
}

async function getTillBalanceCents(userId: string): Promise<number | null> {
  const account = await prisma.account.findFirst({
    where: { type: "CASH", userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true },
  })
  if (!account) return null

  const result = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { accountId: account.id },
    _sum: { debitAmount: true, creditAmount: true },
  })
  const row = result[0]
  return netEffectForAccountType(
    row?._sum.debitAmount ?? 0,
    row?._sum.creditAmount ?? 0,
    account.type
  )
}

async function main() {
  const { userQuery, apply, force } = parseArgs(process.argv.slice(2))
  if (!userQuery) {
    printUsage()
    process.exitCode = 1
    return
  }

  const user = await resolveUser(userQuery)
  const displayName = formatUserDisplayName(user.name, user.id, user.staff?.code)
  console.log(`[end-user-open-shifts] user=${displayName}`)
  console.log(`  id=${user.id}`)
  console.log(`  email=${user.email}`)
  if (user.username) console.log(`  username=${user.username}`)
  console.log(`  mode=${apply ? "APPLY" : "DRY RUN"}`)

  const shifts = await prisma.shift.findMany({
    where: {
      userId: user.id,
      status: { in: [...OPEN_SHIFT_STATUSES] },
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      startedAt: true,
      endsAt: true,
      location: { select: { name: true, code: true } },
    },
  })

  if (shifts.length === 0) {
    console.log("[end-user-open-shifts] no open shifts found. Nothing to do.")
    return
  }

  const shiftIds = shifts.map((s) => s.id)
  const [pendingOutgoing, pendingIncoming, pendingFloat, tillCents] = await Promise.all([
    prisma.shiftHandover.findMany({
      where: {
        shiftId: { in: shiftIds },
        fromUserId: user.id,
        status: HANDOVER_STATUS.PENDING,
      },
      select: {
        id: true,
        shiftId: true,
        toUserId: true,
        totalCents: true,
        toUser: { select: { name: true } },
      },
    }),
    prisma.shiftHandover.findMany({
      where: { toUserId: user.id, status: HANDOVER_STATUS.PENDING },
      select: {
        id: true,
        fromUser: { select: { name: true } },
        totalCents: true,
      },
    }),
    prisma.floatRequest.findMany({
      where: { requestedById: user.id, status: FLOAT_REQUEST_STATUS.PENDING },
      select: { id: true, amountRequested: true },
    }),
    getTillBalanceCents(user.id),
  ])

  console.log(`[end-user-open-shifts] open shifts=${shifts.length}`)
  for (const shift of shifts) {
    const location =
      shift.location?.code || shift.location?.name
        ? `${shift.location.name ?? ""} ${shift.location.code ? `(${shift.location.code})` : ""}`.trim()
        : "(none)"
    console.log(
      `  ${shift.id}  ${SHIFT_STATUS_LABEL[shift.status] ?? shift.status}  started=${shift.startedAt.toISOString()}  endsAt=${shift.endsAt.toISOString()}  location=${location}`
    )
  }

  if (pendingOutgoing.length > 0) {
    console.log(`[end-user-open-shifts] pending outgoing handovers to cancel=${pendingOutgoing.length}`)
    for (const h of pendingOutgoing) {
      console.log(
        `  ${h.id}  shift=${h.shiftId}  to=${h.toUser.name}  total=${formatCents(h.totalCents)}`
      )
    }
  }

  if (pendingIncoming.length > 0) {
    console.log(
      `[end-user-open-shifts] warning: ${pendingIncoming.length} incoming handover(s) still pending this user's acceptance (left unchanged)`
    )
    for (const h of pendingIncoming) {
      console.log(`  ${h.id}  from=${h.fromUser.name}  total=${formatCents(h.totalCents)}`)
    }
  }

  if (pendingFloat.length > 0) {
    console.log(
      `[end-user-open-shifts] warning: ${pendingFloat.length} pending float request(s) left unchanged`
    )
    for (const f of pendingFloat) {
      console.log(`  ${f.id}  amount=${formatCents(f.amountRequested)}`)
    }
  }

  if (tillCents == null) {
    console.log("[end-user-open-shifts] till: no active CASH account")
  } else {
    console.log(`[end-user-open-shifts] till balance=${formatCents(tillCents)}`)
  }

  const tillBlocksApply = tillCents != null && tillCents !== 0 && !force
  if (tillBlocksApply) {
    console.error(
      "[end-user-open-shifts] till still has a balance. This script does not transfer funds. Re-run with --apply --force if you still want to end the shifts."
    )
    process.exitCode = 1
    return
  }

  if (!apply) {
    console.log("[end-user-open-shifts] dry run complete. Re-run with --apply to end these shifts.")
    return
  }

  const now = new Date()

  if (pendingOutgoing.length > 0) {
    await prisma.shiftHandover.updateMany({
      where: { id: { in: pendingOutgoing.map((h) => h.id) } },
      data: {
        status: HANDOVER_STATUS.CANCELLED,
        cancelledAt: now,
        cancelledBy: user.id,
      },
    })
  }

  await prisma.shift.updateMany({
    where: { id: { in: shiftIds } },
    data: {
      status: SHIFT_STATUS.ENDED,
      endedAt: now,
      endedBy: user.id,
      updatedAt: now,
    },
  })

  for (const shift of shifts) {
    await logActivity({
      userId: user.id,
      action: "shift.ended",
      entityType: "Shift",
      entityId: shift.id,
      metadata: {
        endedAt: now.toISOString(),
        adminScript: true,
        previousStatus: shift.status,
        force,
      },
    })
  }

  for (const h of pendingOutgoing) {
    await logActivity({
      userId: user.id,
      action: "shift.handover.cancelled",
      entityType: "ShiftHandover",
      entityId: h.id,
      metadata: {
        shiftId: h.shiftId,
        toUserId: h.toUserId,
        adminScript: true,
        reason: "Pending handover cancelled because open shifts were ended by admin script.",
      },
    })
  }

  console.log(
    `[end-user-open-shifts] ended ${shifts.length} shift(s), cancelled ${pendingOutgoing.length} pending handover(s).`
  )
}

main()
  .catch((error) => {
    console.error("[end-user-open-shifts] failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
