/**
 * One-time fix: allow multiple users to have no username (username null).
 * MongoDB's default unique index only allows one null. This script replaces it
 * with a sparse unique index so username is unique only when set.
 *
 * Run after prisma db push. Run once: npx tsx scripts/fix-user-username-partial-unique.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Drop the existing full unique index on username if present (Prisma may have created "User_username_key")
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
      if (
        err.message?.includes("IndexNotFound") ||
        err.message?.includes("index not found")
      ) {
        continue;
      }
      throw e;
    }
  }

  // Create sparse unique index: only index documents where username exists and is non-empty (excludes null/missing)
  await prisma.$runCommandRaw({
    createIndexes: "User",
    indexes: [
      {
        key: { username: 1 },
        name: "User_username_sparse_unique",
        unique: true,
        sparse: true,
      },
    ],
  });
  console.log(
    "Created sparse unique index User_username_sparse_unique (unique only when username is set)."
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
