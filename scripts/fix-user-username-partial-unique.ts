/**
 * One-time fix: allow multiple users to have no username (username null/missing).
 * MongoDB's default unique index only allows one null. This script replaces it
 * with a partial unique index so username is unique only when set.
 *
 * Run once: npx tsx scripts/fix-user-username-partial-unique.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Drop the existing full unique index on username if present (Prisma creates "User_username_key" or "username_1")
  for (const indexName of ["User_username_key", "username_1"]) {
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

  // Create partial unique index: only index documents where username exists and is a string (excludes null/missing)
  await prisma.$runCommandRaw({
    createIndexes: "User",
    indexes: [
      {
        key: { username: 1 },
        name: "User_username_partial_unique",
        unique: true,
        partialFilterExpression: { username: { $exists: true, $type: "string" } },
      },
    ],
  });
  console.log("Created partial unique index User_username_partial_unique (unique only when username is set).");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
