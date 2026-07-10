// ts-ignore 7017 is used to ignore the error that the global object is not
// defined in the global scope. This is because the global object is only
// defined in the global scope in Node.js and not in the browser.

import { PrismaClient } from './generated/prisma-client';

// Isolated HRM Prisma client (see prisma/schema.prisma output) so this app does
// not share @prisma/client with Channeling or other workspace apps.

const globalForPrisma = globalThis as unknown as { hrmPrisma?: PrismaClient };

// Avoid MaxListenersExceededWarning when Prisma (and other libs) register process exit listeners
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(20);
}

export const prisma = globalForPrisma.hrmPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.hrmPrisma = prisma;

export default prisma;
export { PrismaClient, Prisma } from './generated/prisma-client';
