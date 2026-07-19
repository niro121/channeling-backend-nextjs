// ts-ignore 7017 is used to ignore the error that the global object is not
// defined in the global scope. This is because the global object is only
// defined in the global scope in Node.js and not in the browser.

import { PrismaClient } from './generated/prisma/';

// Isolated DPAY Prisma client (see prisma/schema.prisma output) so this app does
// not share @prisma/client with Channeling or other workspace apps.

const globalForPrisma = globalThis as unknown as {
  hrmPrisma?: PrismaClient;
  hrmPrismaSchemaVersion?: string;
};

/** Bump when Prisma schema fields change so HMR does not keep a stale client. */
const PRISMA_SCHEMA_VERSION = 'receipt-canceled-by-v1';

// Avoid MaxListenersExceededWarning when Prisma (and other libs) register process exit listeners
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(20);
}

function createPrismaClient() {
  return new PrismaClient();
}

if (
  process.env.NODE_ENV !== 'production' &&
  globalForPrisma.hrmPrisma &&
  globalForPrisma.hrmPrismaSchemaVersion !== PRISMA_SCHEMA_VERSION
) {
  void globalForPrisma.hrmPrisma.$disconnect().catch(() => undefined);
  globalForPrisma.hrmPrisma = undefined;
}

export const prisma = globalForPrisma.hrmPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.hrmPrisma = prisma;
  globalForPrisma.hrmPrismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}

export default prisma;
export { PrismaClient, Prisma } from './generated/prisma/';
