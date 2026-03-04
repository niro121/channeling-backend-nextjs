/**
 * TEMPORARY script: Delete all float requests and flush all journal entries
 * (delete all JournalLine and Journal records). Use for resetting float/accounting
 * data during development. Run with care.
 *
 * Order: FloatRequest -> JournalLine -> Journal (to satisfy relations).
 *
 * Run: npx tsx scripts/delete-float-requests-and-journals.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Delete all float requests (they may reference Journal; we clear them first)
  const deletedRequests = await prisma.floatRequest.deleteMany({});
  console.log("Deleted", deletedRequests.count, "float request(s).");

  // 2. Delete all journal lines
  const deletedLines = await prisma.journalLine.deleteMany({});
  console.log("Deleted", deletedLines.count, "journal line(s).");

  // 3. Delete all journals
  const deletedJournals = await prisma.journal.deleteMany({});
  console.log("Deleted", deletedJournals.count, "journal(s).");

  console.log("\nDone. All float requests and journal entries have been removed.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
