/**
 * One-time migration: rename `visibility` to `status` in Department and Zone collections.
 * Run after schema change from visibility to status (0 = unpublish, 1 = publish).
 * Uses Prisma $runCommandRaw (no direct mongodb dependency).
 *
 * Usage: npx tsx scripts/rename-visibility-to-status.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Department: rename visibility -> status
  const depResult = (await prisma.$runCommandRaw({
    update: 'Department',
    updates: [
      {
        q: { visibility: { $exists: true } },
        u: { $rename: { visibility: 'status' } },
        multi: true,
        upsert: false,
      },
    ],
  })) as { n?: number; nModified?: number };

  const depModified = depResult?.nModified ?? depResult?.n ?? 0;
  console.log(`Department: renamed visibility -> status for ${depModified} document(s).`);

  // Zone: rename visibility -> status
  const zoneResult = (await prisma.$runCommandRaw({
    update: 'Zone',
    updates: [
      {
        q: { visibility: { $exists: true } },
        u: { $rename: { visibility: 'status' } },
        multi: true,
        upsert: false,
      },
    ],
  })) as { n?: number; nModified?: number };

  const zoneModified = zoneResult?.nModified ?? zoneResult?.n ?? 0;
  console.log(`Zone: renamed visibility -> status for ${zoneModified} document(s).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
