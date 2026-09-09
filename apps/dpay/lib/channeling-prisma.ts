import { PrismaClient } from './generated/channeling-prisma';

const globalForPrisma = globalThis as unknown as {
  channelingPrisma?: PrismaClient;
  channelingPrismaSchemaVersion?: string;
};

const CHANNELING_PRISMA_SCHEMA_VERSION = 'dpay-channeling-banks-v1';

export function getChannelingPrisma(): PrismaClient {
  if (!process.env.CHANNELING_DATABASE_URL?.trim()) {
    throw new Error(
      'CHANNELING_DATABASE_URL is not set. Required to resolve User Location from Channeling.'
    );
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    globalForPrisma.channelingPrisma &&
    globalForPrisma.channelingPrismaSchemaVersion !== CHANNELING_PRISMA_SCHEMA_VERSION
  ) {
    void globalForPrisma.channelingPrisma.$disconnect().catch(() => undefined);
    globalForPrisma.channelingPrisma = undefined;
  }

  if (!globalForPrisma.channelingPrisma) {
    globalForPrisma.channelingPrisma = new PrismaClient();
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.channelingPrismaSchemaVersion = CHANNELING_PRISMA_SCHEMA_VERSION;
    }
  }

  return globalForPrisma.channelingPrisma;
}
