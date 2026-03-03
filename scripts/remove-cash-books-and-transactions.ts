/**
 * TEMPORARY script: Remove all Cash Book accounts and every journal (transaction)
 * that has any line touching a cash account. Keeps non-cash accounts and journals
 * that never touched cash.
 *
 * Use for resetting accounting cash data during development. Run with care.
 *
 * Run: npx tsx scripts/remove-cash-books-and-transactions.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cashAccounts = await prisma.account.findMany({
    where: { type: "CASH", isActive: true },
    select: { id: true, name: true, code: true },
  });

  if (cashAccounts.length === 0) {
    console.log("No cash book accounts found. Nothing to remove.");
    return;
  }

  const cashAccountIds = cashAccounts.map((a) => a.id);

  console.log("Found", cashAccounts.length, "cash book account(s):");
  cashAccounts.forEach((a) => console.log("  -", a.name, a.code ?? ""));

  // 1. Find all journals that have at least one line referencing a cash account
  const linesTouchingCash = await prisma.journalLine.findMany({
    where: { accountId: { in: cashAccountIds } },
    select: { journalId: true },
    distinct: ["journalId"],
  });
  const journalIdsToRemove = linesTouchingCash.map((l) => l.journalId);

  if (journalIdsToRemove.length > 0) {
    // 2. Delete all lines of those journals (cascade would do this when we delete journals; we delete lines first to be explicit)
    const deletedLines = await prisma.journalLine.deleteMany({
      where: { journalId: { in: journalIdsToRemove } },
    });
    console.log("\nDeleted", deletedLines.count, "journal line(s) from journals that touched cash.");

    // 3. Delete those journals
    await prisma.journal.deleteMany({
      where: { id: { in: journalIdsToRemove } },
    });
    console.log("Deleted", journalIdsToRemove.length, "journal(s).");
  } else {
    console.log("\nNo journals reference cash accounts.");
  }

  // 4. Delete all cash accounts
  const deletedAccounts = await prisma.account.deleteMany({
    where: { id: { in: cashAccountIds } },
  });
  console.log("Deleted", deletedAccounts.count, "cash book account(s).");

  console.log("\nDone.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
