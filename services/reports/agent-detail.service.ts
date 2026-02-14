'use server';

import prisma from '@/lib/prisma';
import { AgentDetailReportQuery } from '@/types/report';
import moment from 'moment';

// Get Prisma types from the prisma instance
type ExtractWhereInput<T> = T extends { where?: infer W } ? W : never;
type PrismaAgencyWhereInput = ExtractWhereInput<NonNullable<Parameters<typeof prisma.agency.findMany>[0]>>;

// ==== GET AGENT DETAIL REPORT DATA ==== //
export const getAgentDetailReportDataService = async ({
  fromDate,
  toDate,
  agencyName,
  agencyCode,
  status
}: AgentDetailReportQuery) => {
  try {
    const whereClause: PrismaAgencyWhereInput = {};

    // Date range filter (required) - filter by createdAt
    const startOfDay = moment(fromDate).startOf('day').toDate();
    const endOfDay = moment(toDate).endOf('day').toDate();

    whereClause.createdAt = {
      gte: startOfDay,
      lte: endOfDay,
    };

    // Agency name filter (optional)
    if (agencyName && agencyName.trim() !== '') {
      whereClause.name = {
        contains: agencyName.trim(),
        mode: 'insensitive'
      };
    }

    // Agency code filter (optional)
    if (agencyCode && agencyCode.trim() !== '') {
      whereClause.code = {
        contains: agencyCode.trim(),
        mode: 'insensitive'
      };
    }

    // Status filter (optional)
    if (status && status !== '__all__') {
      whereClause.status = status === '1' ? 1 : 0;
    }

    const records = await prisma.agency.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.agency.count({
      where: whereClause
    });

    return {
      success: true,
      data: records,
      totalRecords
    };
  } catch (error: unknown) {
    console.error('getAgentDetailReportDataService error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting agent detail report data';
    throw new Error(errorMessage);
  }
};
