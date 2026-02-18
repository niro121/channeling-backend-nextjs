/**
 * One-time migration: convert Session.startTime and Session.endTime from Int to DateTime.
 * Run this after deploying the schema change (startTime/endTime as DateTime).
 *
 * Handles two legacy formats:
 * - Unix seconds (number >= 1e9): from analyse-sessions
 * - Minutes from midnight (0-1439): from create-doctor-session
 *
 * Usage: npx tsx scripts/migrate-session-start-end-to-datetime.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toDate(value: unknown, sessionDate: Date): Date {
  if (value instanceof Date) return value;
  const n = Number(value);
  if (Number.isNaN(n)) return sessionDate;
  if (n >= 1e9 && n < 1e13) return new Date(n * 1000); // unix seconds
  const d = new Date(sessionDate);
  d.setUTCHours(Math.floor(n / 60), n % 60, 0, 0);
  return d;
}

async function main() {
  const sessions = await prisma.session.findMany({
    select: { id: true, date: true, startTime: true, endTime: true },
  });

  let updated = 0;
  for (const s of sessions) {
    const start = s.startTime;
    const end = s.endTime;
    if (start instanceof Date && end instanceof Date) continue;

    const sessionDate = s.date instanceof Date ? s.date : new Date(s.date);
    const startDate = toDate(start, sessionDate);
    const endDate = toDate(end, sessionDate);

    await prisma.session.update({
      where: { id: s.id },
      data: { startTime: startDate, endTime: endDate },
    });
    updated++;
  }

  console.log(`Migrated ${updated} of ${sessions.length} sessions (startTime/endTime → DateTime).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
