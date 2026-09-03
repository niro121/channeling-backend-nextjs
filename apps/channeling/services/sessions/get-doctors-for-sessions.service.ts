'use server';

import prisma from '@/lib/prisma';

/**
 * Load doctor sessions (list of doctors for the sessions feature).
 * Used for dropdown and to resolve which doctor(s) to run Analyse & Create or Update for.
 */
export const getDoctorsForSessionsService = async () => {
  try {
    const records = await prisma.doctor.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    });

    const totalRecords = await prisma.doctor.count({
      where: { status: 1 },
    });

    return {
      data: records,
      totalRecords,
    };
  } catch (error) {
    console.error('getDoctorsForSessionsService error', error);
    throw error;
  }
};
