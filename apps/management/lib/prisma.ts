import 'server-only';
import { PrismaClient } from './generated/prisma-client';

// Management-domain client (tasks) — generated from prisma/schema.prisma into lib/generated so it
// doesn't share @prisma/client with channeling or db-auth. Users live in @archmage/db-auth.

const globalForPrisma = globalThis as unknown as { managementPrisma?: PrismaClient };

export const prisma = globalForPrisma.managementPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.managementPrisma = prisma;
