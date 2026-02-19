/**
 * One-time fix: allow multiple users to have no staff (staffId null).
 * MongoDB's default unique index only allows one null. This script replaces it
 * with a partial unique index so staffId is unique only when set.
 *
 * Run once: npx tsx scripts/fix-user-staffid-partial-unique.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Drop the existing full unique index on staffId if present (Prisma creates "User_staffId_key" or "staffId_1")
  for (const indexName of ["User_staffId_key", "staffId_1"]) {
    try {
      await prisma.$runCommandRaw({
        dropIndexes: "User",
        index: indexName,
      });
      console.log("Dropped index", indexName);
      break;
    } catch (e: unknown) {
      const err = e as { message?: string }; 
      if (err.message?.includes("IndexNotFound") || err.message?.includes("index not found")) {
        // already dropped or different name, continue
        continue;
      }
      throw e;
    }
  }

  // Create partial unique index: only index documents where staffId exists and is an ObjectId (excludes null/missing)
  await prisma.$runCommandRaw({
    createIndexes: "User",
    indexes: [
      {
        key: { staffId: 1 },
        name: "User_staffId_partial_unique",
        unique: true,
        partialFilterExpression: { staffId: { $type: "objectId" } },
      },
    ],
  });
  console.log("Created partial unique index User_staffId_partial_unique (unique only when staffId is set).");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
