'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import moment from 'moment';

export const getAllSessionsService = async ({
  page,
  limit,
  date,
  fromDate,
  toDate,
  doctorId,
}: {
  page: number;
  limit: number;
  date?: Date;
  fromDate?: Date;
  toDate?: Date;
  doctorId?: string;
}): Promise<{
  success: boolean;
  data?: {
    records: any[];
    totalRecords: number;
  };
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  const skip = page * limit;

  try {
    const whereClause: Prisma.SessionWhereInput = {};

    if (fromDate && toDate) {
      const rangeStart = moment(fromDate).startOf('day').toDate();
      const rangeEnd = moment(toDate).endOf('day').toDate();
      whereClause.date = { gte: rangeStart, lte: rangeEnd };
      if (doctorId) whereClause.doctorId = doctorId;
    } else if (date && doctorId) {
      const dateMoment = moment(date);
      whereClause.date = {
        gte: dateMoment.startOf('day').toDate(),
        lte: dateMoment.endOf('day').toDate(),
      };
      whereClause.doctorId = doctorId;
    } else if (date) {
      const dateMoment = moment(date);
      whereClause.date = {
        gte: dateMoment.startOf('day').toDate(),
        lte: dateMoment.endOf('day').toDate(),
      };
    } else if (doctorId) {
      const todayStart = moment().startOf('day').toDate();
      const todayEnd = moment().endOf('day').toDate();
      whereClause.doctorId = doctorId;
      whereClause.date = { gte: todayStart, lte: todayEnd };
    }

    const records = await prisma.session.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        doctor: true,
        department: true,
        location: true,
        room: true,
        createdUser: true,
        updatedUser: true,
      },
    });

    const totalRecords = await prisma.session.count({
      where: whereClause,
    });

    const doctorSessionIds = [
      ...new Set(records.map((r) => r.doctorSessionId).filter(Boolean)),
    ];
    const doctorSessions =
      doctorSessionIds.length > 0
        ? await prisma.doctorSession.findMany({
            where: { id: { in: doctorSessionIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameMap = Object.fromEntries(
      doctorSessions.map((ds) => [ds.id, ds.name])
    );
    const enrichedRecords = records.map((r) => ({
      ...r,
      originalSessionName: nameMap[r.doctorSessionId] ?? '—',
    }));

    return {
      success: true,
      data: {
        records: enrichedRecords,
        totalRecords,
      },
      message: 'Sessions fetched successfully',
    };
  } catch (error: any) {
    console.error('getAllSessionsService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch sessions',
      },
    };
  }
};
