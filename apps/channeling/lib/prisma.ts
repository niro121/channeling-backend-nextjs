// ts-ignore 7017 is used to ignore the error that the global object is not
// defined in the global scope. This is because the global object is only
// defined in the global scope in Node.js and not in the browser.

import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Avoid MaxListenersExceededWarning when Prisma (and other libs) register process exit listeners
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(20)
}

export const prisma = globalForPrisma.prisma || new PrismaClient()

// Production too: the Next build holds several copies of this module, and each copy would otherwise
// open its own query engine and connection pool.
globalForPrisma.prisma = prisma

export default prisma