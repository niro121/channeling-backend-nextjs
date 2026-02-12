'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { DoctorReportQuery, ChannelAgentReferenceBookReportQuery } from '@/types/report';
import moment from 'moment';

// ==== GET DOCTOR REPORT DATA ==== //
export const getDoctorReportDataService = async ({
  date,
  doctorName,
  doctorCode
}: DoctorReportQuery) => {
  try {
    // Build where clause for filtering
    const whereClause: Prisma.DoctorWhereInput = {};

    // Apply doctor name filter
    if (doctorName && doctorName.trim() !== '') {
      whereClause.name = {
        contains: doctorName.trim(),
        mode: Prisma.QueryMode.insensitive
      };
    }

    // Apply doctor code filter
    if (doctorCode && doctorCode.trim() !== '') {
      whereClause.code = {
        contains: doctorCode.trim(),
        mode: Prisma.QueryMode.insensitive
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

// ==== GET CHANNEL AGENT REFERENCE BOOK REPORT DATA ==== //
export const getChannelAgentReferenceBookReportDataService = async ({
  fromDate,
  toDate,
  agencyId,
  bookNumber
}: ChannelAgentReferenceBookReportQuery) => {
  try {
    const whereClause: Prisma.AgencyBookWhereInput = {};

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
        mode: Prisma.QueryMode.insensitive
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
    records.forEach((record) => {
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

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Attach user information to records
    const recordsWithUsers = records.map((record) => {
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
