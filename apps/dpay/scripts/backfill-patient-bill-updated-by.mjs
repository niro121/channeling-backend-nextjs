/**
 * One-time backfill: set updatedBy / updatedByName from createdBy / createdByName
 * when missing on existing patient bills.
 *
 * Usage: node scripts/backfill-patient-bill-updated-by.mjs
 */
import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
  const bills = await prisma.patientBill.findMany({
    select: {
      id: true,
      billNumber: true,
      createdBy: true,
      createdByName: true,
      updatedBy: true,
      updatedByName: true,
    },
  });

  const needsBackfill = bills.filter(
    (bill) =>
      (!bill.updatedByName?.trim() && bill.createdByName?.trim()) ||
      (!bill.updatedBy && bill.createdBy)
  );

  if (needsBackfill.length === 0) {
    console.log('No patient bills need backfill.');
    return;
  }

  let updated = 0;
  for (const bill of needsBackfill) {
    await prisma.patientBill.update({
      where: { id: bill.id },
      data: {
        updatedBy: bill.updatedBy ?? bill.createdBy ?? undefined,
        updatedByName: bill.updatedByName?.trim()
          ? bill.updatedByName
          : bill.createdByName?.trim() || undefined,
      },
    });
    updated += 1;
    console.log(`Backfilled ${bill.billNumber} (${bill.id})`);
  }

  console.log(`Done. Updated ${updated} of ${needsBackfill.length} bill(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
