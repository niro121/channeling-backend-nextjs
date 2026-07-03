import { PrismaClient } from "./generated/client";

const globalForPrisma = globalThis as unknown as { authPrisma?: PrismaClient };

export const authPrisma =
  globalForPrisma.authPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.authPrisma = authPrisma;
}

export { PrismaClient } from "./generated/client";
export type { User, UserGroup } from "./generated/client";
