'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { GetActiveSession, GetDoctorLeavesQuery } from '@/types/doctor.leave';

// ==== GET LEAVES FOR A SPECIFIC DOCTOR ==== //
/** Convert YYYY-MM-DD to YYYYMMDD number for comparison with DoctorLeave.fromDate/toDate */
function dateStringToInt(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

export const getDoctorLeavesService = async ({
  page,
  limit,
  doctorId,
  fromDate,
  toDate
}: GetDoctorLeavesQuery): Promise<{
  success: boolean;
  data?: any[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  const skip = page * limit;

  try {
    const whereClause: Prisma.DoctorLeaveWhereInput = {
      doctorId
    };

    if (fromDate && toDate) {
      const filterFrom = dateStringToInt(fromDate);
      const filterTo = dateStringToInt(toDate);
      whereClause.AND = [
        { toDate: { gte: filterFrom } },
        { fromDate: { lte: filterTo } }
      ];
    } else if (fromDate) {
      whereClause.toDate = { gte: dateStringToInt(fromDate) };
    } else if (toDate) {
      whereClause.fromDate = { lte: dateStringToInt(toDate) };
    }

    const records = await prisma.doctorLeave.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: { fromDate: 'desc' },
      include: {
        doctor: { select: { id: true, name: true, code: true } }
      }
    });

    const totalRecords = await prisma.doctorLeave.count({
      where: whereClause
    });

    return {
      success: true,
      data: records,
      totalRecords: totalRecords
    };
  } catch (error: any) {
    console.error('getDoctorLeavesService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? 'Failed to fetch doctor leaves' }
    };
  }
};

// ==== GET ALL ACTIVE SESSIONS TO SPECIFIC DATE RANGE ==== //
export const getActiveSessionsService = async ({
  doctorId,
  fromDate,
  toDate
}: GetActiveSession): Promise<{
  success: boolean;
  data?: any[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const whereClause: Prisma.SessionWhereInput = {
      doctorId,
      status: 1 // ✅ ACTIVE sessions only
    };

    // Date filtering (Session.date is DateTime)
    if (fromDate && toDate) {
      whereClause.date = {
        gte: new Date(fromDate),
        lte: new Date(toDate)
      };
    } else if (fromDate) {
      whereClause.date = {
        gte: new Date(fromDate)
      };
    } else if (toDate) {
      whereClause.date = {
        lte: new Date(toDate)
      };
    }

    const records = await prisma.session.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: {
        doctor: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
        room: { select: { id: true, number: true } },
        department: { select: { id: true, name: true } }
      }
    });

    const totalRecords = await prisma.session.count({
      where: whereClause
    });

    return {
      success: true,
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.error('getActiveSessionsService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? 'Failed to fetch active sessions' }
    };
  }
};

