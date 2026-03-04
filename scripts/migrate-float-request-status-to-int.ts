/**
 * One-time migration: convert FloatRequest.status from string enum to Int.
 * Run after changing schema from FloatRequestStatus enum to status Int.
 * Use when you have existing FloatRequest documents with string status in MongoDB.
 * Usage: npx tsx scripts/migrate-float-request-status-to-int.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_MAP: Record<string, number> = {
  PENDING: 0,
  APPROVED: 1,
  RECEIVED: 2,
  REJECTED: 3,
  CANCELLED: 4,
};

async function main() {
  const requests = await prisma.floatRequest.findMany({ select: { id: true, status: true } });
  let updated = 0;
  for (const r of requests) {
    const current = (r as { status: unknown }).status;
    if (typeof current === 'number') continue;
    const num = STATUS_MAP[String(current)];
    if (num === undefined) {
      console.warn(`Unknown status "${current}" for request ${r.id}, skipping.`);
      continue;
    }
    await prisma.floatRequest.update({
      where: { id: r.id },
      data: { status: num },
    });
    updated++;
  }
  console.log(`Migrated ${updated} FloatRequest(s) from string status to int.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
