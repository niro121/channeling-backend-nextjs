'use server';

import prisma from '@/lib/prisma';
import { getAccountBalance } from '@/services/accounting/balance-calc.service';
import { AgentDetailReportQuery } from '@/types/report';
import moment from 'moment';

// Get Prisma types from the prisma instance
type ExtractWhereInput<T> = T extends { where?: infer W } ? W : never;
type PrismaAgencyWhereInput = ExtractWhereInput<NonNullable<Parameters<typeof prisma.agency.findMany>[0]>>;

// ==== GET AGENT DETAIL REPORT DATA ==== //
export const getAgentDetailReportDataService = async ({
  fromDate,
  toDate,
  agencyId,
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

    // Agency selector filter (optional)
    if (agencyId && agencyId !== '__all__') {
      whereClause.id = agencyId;
    }

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

    const rows = await prisma.agency.findMany({
      where: whereClause,
      include: {
        accounts: {
          where: { type: 'PAYABLE', isActive: true },
          take: 1,
          select: { id: true },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.agency.count({
      where: whereClause
    });

    const records = await Promise.all(
      rows.map(async (row) => {
        const acc = row.accounts?.[0];
        const balanceCents = acc ? await getAccountBalance(acc.id) : 0;
        const { accounts: _a, ...rest } = row;
        return {
          ...rest,
          balance: balanceCents / 100,
        };
      })
    );

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
