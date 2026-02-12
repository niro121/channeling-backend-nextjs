'use server';

import prisma from '@/lib/prisma';
import { DoctorReportQuery, ChannelAgentReferenceBookReportQuery,DoctorArrivalsReportQuery } from '@/types/report';
import moment from 'moment';

// Get Prisma types from the prisma instance
type ExtractWhereInput<T> = T extends { where?: infer W } ? W : never;
type PrismaDoctorWhereInput = ExtractWhereInput<NonNullable<Parameters<typeof prisma.doctor.findMany>[0]>>;
type PrismaSessionWhereInput = ExtractWhereInput<NonNullable<Parameters<typeof prisma.session.findMany>[0]>>;
type PrismaAgencyBookWhereInput = ExtractWhereInput<NonNullable<Parameters<typeof prisma.agencyBook.findMany>[0]>>;

// ==== GET DOCTOR REPORT DATA ==== //
export const getDoctorReportDataService = async ({
  date,
  doctorName,
  doctorCode
}: DoctorReportQuery) => {
  try {
    // Build where clause for filtering
    const whereClause: PrismaDoctorWhereInput = {};

    // Apply doctor name filter
    if (doctorName && doctorName.trim() !== '') {
      whereClause.name = {
        contains: doctorName.trim(),
        mode: 'insensitive'
      };
    }

    // Apply doctor code filter
    if (doctorCode && doctorCode.trim() !== '') {
      whereClause.code = {
        contains: doctorCode.trim(),
        mode: 'insensitive'
      };
    }

    // Fetch all doctors with their related data in a single query
    // Note: Date filter is for future use with sessions/transactions
    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        createdUser: true,
        updatedUser: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      success: true,
      data: doctors,
      totalRecords: doctors.length
    };
  } catch (error: any) {
    console.error('getDoctorReportDataService error', error);
    throw new Error(error.message ?? 'Error getting doctor report data');
  }
};

// ==== GET DOCTOR ARRIVALS REPORT DATA ==== //
export const getDoctorArrivalsReportDataService = async ({
  doctorId,
  locationId,
  fromDate,
  toDate
}: DoctorArrivalsReportQuery) => {
  try {
    // Parse dates
    const fromDateObj = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
    const toDateObj = typeof toDate === 'string' ? new Date(toDate) : toDate;

    const fromDateStart = moment(fromDateObj).startOf('day').toDate();
    const toDateEnd = moment(toDateObj).endOf('day').toDate();

    // Build where clause
    const whereClause: PrismaSessionWhereInput = {
      date: {
        gte: fromDateStart,
        lte: toDateEnd
      }
    };

    // Apply doctor filter
    if (doctorId) {
      whereClause.doctorId = doctorId;
    }

    // Apply location filter
    if (locationId) {
      whereClause.locationId = locationId;
    }

    // Fetch sessions with related data
    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        doctor: true,
        location: true,
        room: true,
        createdUser: true,
        updatedUser: true
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return {
      success: true,
      data: sessions,
      totalRecords: sessions.length
    };
  } catch (error: any) {
    console.error('getDoctorArrivalsReportDataService error', error);
    throw new Error(error.message ?? 'Error getting doctor arrivals report data');
  }
};

// ==== GET CHANNEL AGENT REFERENCE BOOK REPORT DATA ==== //
export const getChannelAgentReferenceBookReportDataService = async ({
  fromDate,
  toDate,
  agencyId,
  bookNumber
}: ChannelAgentReferenceBookReportQuery) => {
  try {
    const whereClause: PrismaAgencyBookWhereInput = {};

    // Date range filter (required)
    const startOfDay = moment(fromDate).startOf('day').toDate();
    const endOfDay = moment(toDate).endOf('day').toDate();

    whereClause.createdAt = {
      gte: startOfDay,
      lte: endOfDay,
    };

    // Agency filter (optional)
    if (agencyId && agencyId !== '__all__') {
      whereClause.agencyId = agencyId;
    }

    // Book number filter (optional)
    if (bookNumber && bookNumber.trim() !== '') {
      whereClause.bookNumber = {
        contains: bookNumber.trim(),
        mode: 'insensitive'
      };
    }

    const records = await prisma.agencyBook.findMany({
      where: whereClause,
      include: {
        agency: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch users for createdBy and updatedBy
    const userIds = new Set<string>();
    records.forEach((record:any) => {
      if (record.createdBy) userIds.add(record.createdBy);
      if (record.updatedBy) userIds.add(record.updatedBy);
    });

    const users = userIds.size > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: Array.from(userIds)
            }
          },
          select: {
            id: true,
            name: true
          }
        })
      : [];

    type UserInfo = { id: string; name: string | null };
    const userMap = new Map<string, UserInfo>(users.map((u: UserInfo) => [u.id, u]));

    // Attach user information to records
    const recordsWithUsers = records.map((record:any) => {
      const createdUser = record.createdBy ? userMap.get(record.createdBy) : null;
      const updatedUser = record.updatedBy ? userMap.get(record.updatedBy) : null;

      return {
        ...record,
        createdUser: createdUser ? { name: createdUser.name || '', code: createdUser.id || null } : null,
        updatedUser: updatedUser ? { name: updatedUser.name || '', code: updatedUser.id || null } : null
      };
    });

    const totalRecords = await prisma.agencyBook.count({
      where: whereClause
    });

    return {
      success: true,
      data: recordsWithUsers,
      totalRecords
    };
  } catch (error: any) {
    console.error('getChannelAgentReferenceBookReportDataService error', error);
    throw new Error(error.message ?? 'Error getting channel agent reference book report data');
  }
};
