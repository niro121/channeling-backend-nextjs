// ts-ignore 7017 is used to ignore the error that the global object is not
// defined in the global scope. This is because the global object is only
// defined in the global scope in Node.js and not in the browser.

import { PrismaClient } from '@/lib/generated/prisma';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Avoid MaxListenersExceededWarning when Prisma (and other libs) register process exit listeners
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(20);
}

function createPrismaClient() {
  return new PrismaClient();
}

function hasCurrentSchema(client: PrismaClient) {
  return (
    typeof (client as PrismaClient & { patientBillReceipt?: unknown }).patientBillReceipt !==
    'undefined'
  );
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;

  if (cached && hasCurrentSchema(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect();
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = getPrismaClient();

export default prisma;
