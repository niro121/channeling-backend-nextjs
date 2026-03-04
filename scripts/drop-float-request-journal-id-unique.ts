/**
 * One-time fix: allow multiple FloatRequests to have null journalId (before approval).
 * MongoDB's unique index on journalId only allows one null. This script drops that index.
 *
 * Run after removing @unique from FloatRequest.journalId and running prisma db push.
 * Run once: npx tsx scripts/drop-float-request-journal-id-unique.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const indexName = "FloatRequest_journalId_key";
  try {
    await prisma.$runCommandRaw({
      dropIndexes: "FloatRequest",
      index: indexName,
    });
    console.log("Dropped index", indexName);
  } catch (e: unknown) {
    const err = e as { message?: string; code?: number } = e as any;
    if (
      err.message?.includes("IndexNotFound") ||
      err.message?.includes("index not found") ||
      err.code === 27
    ) {
      console.log("Index", indexName, "not found (already dropped or never created).");
      return;
    }
    throw e;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
