/**
 * One-time data fix for Mongo unique index:
 *   @@unique([sessionId, appointmentNo])
 *
 * Problem:
 * - Existing Booking rows with sessionId = null can share the same appointmentNo.
 * - Mongo unique index treats { sessionId: null, appointmentNo: X } as a real key,
 *   so duplicates fail index build.
 *
 * What this script does:
 * - Scans Booking rows where sessionId is null.
 * - For duplicated appointmentNo values, keeps the earliest row unchanged.
 * - Reassigns new unique appointmentNo values to the remaining duplicates.
 *
 * Usage:
 *   Dry run (default):
 *     npx tsx scripts/fix-booking-null-session-appointmentno-duplicates.ts
 *
 *   Apply changes:
 *     npx tsx scripts/fix-booking-null-session-appointmentno-duplicates.ts --apply
 */

import 'dotenv/config'
import prisma from '@/lib/prisma'

type NullSessionBooking = {
  id: string
  appointmentNo: number
  createdAt: Date
}

function parseApplyFlag(): boolean {
  return process.argv.includes('--apply')
}

async function main() {
  const apply = parseApplyFlag()

  const rows = await prisma.booking.findMany({
    where: { sessionId: null },
    select: { id: true, appointmentNo: true, createdAt: true },
    orderBy: [{ appointmentNo: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  })

  if (rows.length === 0) {
    console.log('No Booking rows found with sessionId = null. Nothing to do.')
    return
  }

  const groups = new Map<number, NullSessionBooking[]>()
  for (const row of rows) {
    const key = row.appointmentNo
    const list = groups.get(key) ?? []
    list.push({
      id: row.id,
      appointmentNo: row.appointmentNo,
      createdAt: row.createdAt,
    })
    groups.set(key, list)
  }

  const duplicateGroups = [...groups.entries()].filter(([, list]) => list.length > 1)
  const duplicateCount = duplicateGroups.reduce((sum, [, list]) => sum + (list.length - 1), 0)

  if (duplicateCount === 0) {
    console.log('No duplicate (sessionId=null, appointmentNo) keys found. Nothing to update.')
    return
  }

  const usedNumbers = new Set(rows.map((r) => r.appointmentNo))
  let nextAppointmentNo = Math.max(...usedNumbers) + 1

  const updates: Array<{ id: string; from: number; to: number }> = []

  for (const [, list] of duplicateGroups) {
    // Keep the first (earliest) record unchanged; re-number the rest.
    for (let i = 1; i < list.length; i += 1) {
      const row = list[i]!
      while (usedNumbers.has(nextAppointmentNo)) nextAppointmentNo += 1
      updates.push({
        id: row.id,
        from: row.appointmentNo,
        to: nextAppointmentNo,
      })
      usedNumbers.add(nextAppointmentNo)
      nextAppointmentNo += 1
    }
  }

  console.log(`Found ${rows.length} rows with sessionId=null`)
  console.log(`Found ${duplicateGroups.length} duplicate appointmentNo groups`)
  console.log(`Need to update ${updates.length} rows`)

  const preview = updates.slice(0, 20)
  if (preview.length > 0) {
    console.log('Preview (first 20 updates):')
    for (const item of preview) {
      console.log(`- ${item.id}: ${item.from} -> ${item.to}`)
    }
    if (updates.length > preview.length) {
      console.log(`... and ${updates.length - preview.length} more`)
    }
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to write changes.')
    return
  }

  for (const item of updates) {
    await prisma.booking.update({
      where: { id: item.id },
      data: { appointmentNo: item.to },
    })
  }

  console.log(`\nApplied ${updates.length} updates successfully.`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

