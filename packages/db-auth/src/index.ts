import { PrismaClient } from "./generated/client";

const globalForPrisma = globalThis as unknown as {
  authPrisma?: PrismaClient;
  authPrismaSchemaVersion?: string;
};

/** Bump when auth Prisma schema fields change so HMR does not keep a stale client. */
const AUTH_PRISMA_SCHEMA_VERSION = "auth-user-group-app-v1";

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.authPrisma &&
  globalForPrisma.authPrismaSchemaVersion !== AUTH_PRISMA_SCHEMA_VERSION
) {
  void globalForPrisma.authPrisma.$disconnect().catch(() => undefined);
  globalForPrisma.authPrisma = undefined;
}

export const authPrisma =
  globalForPrisma.authPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.authPrisma = authPrisma;
  globalForPrisma.authPrismaSchemaVersion = AUTH_PRISMA_SCHEMA_VERSION;
}

export { PrismaClient } from "./generated/client";
export type { User, UserGroup } from "./generated/client";
