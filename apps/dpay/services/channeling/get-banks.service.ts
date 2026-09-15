import { getChannelingPrisma } from '@/lib/channeling-prisma';

export type ChannelingBankOption = { id: string; name: string };

const TAG_TYPE_BANK = 4;
const TAG_STATUS_ACTIVE = 1;

export async function getChannelingBanks(): Promise<{
  success: boolean;
  data?: ChannelingBankOption[];
  message?: string;
}> {
  try {
    if (!process.env.CHANNELING_DATABASE_URL?.trim()) {
      return {
        success: false,
        message:
          'CHANNELING_DATABASE_URL is not set. Required to load banks from Channeling.',
      };
    }

    const prisma = getChannelingPrisma();
    const records = await prisma.tag.findMany({
      where: { status: TAG_STATUS_ACTIVE, type: TAG_TYPE_BANK },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    const data: ChannelingBankOption[] = records
      .filter((r) => r.id && r.name?.trim())
      .map((r) => ({ id: r.id, name: r.name!.trim() }));

    return { success: true, data };
  } catch (error: unknown) {
    console.error('getChannelingBanks error', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch banks',
    };
  }
}
