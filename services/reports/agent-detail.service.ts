'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { getAccountBalance } from '@/services/accounting/balance-calc.service';
import { AgentDetailReportQuery } from '@/types/report';
import moment from 'moment';

// Get Prisma types from the prisma instance
type ExtractWhereInput<T> = T extends { where?: infer W } ? W : never;
type PrismaAgencyWhereInput = ExtractWhereInput<NonNullable<Parameters<typeof prisma.agency.findMany>[0]>>;
const MAX_RANGE_DAYS = getReportMaxRangeDays('agent_detail', 62);
const MAX_RECORDS_SCAN = getReportMaxRecords('agent_detail', 20000);

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
    const daySpan = getInclusiveDaySpan(startOfDay, endOfDay);
    if (daySpan > MAX_RANGE_DAYS) {
      throw new Error(`Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`);
    }

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

    const totalRecords = await prisma.agency.count({
      where: whereClause
    });
    if (totalRecords > MAX_RECORDS_SCAN) {
      throw new Error(`Too many records in selected range (${totalRecords}). Please narrow filters/date range.`);
    }

    const rows = await prisma.agency.findMany({
      where: whereClause,
      include: {
        accounts: {
          where: { type: 'PAYABLE', isActive: true },
          take: 1,
          select: { id: true, maxBalanceAllowed: true },
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const records = await Promise.all(
      rows.map(async (row) => {
        const acc = row.accounts?.[0];
        const balanceCents = acc ? await getAccountBalance(acc.id) : 0;
        const maxLimitLkr = acc?.maxBalanceAllowed ? Number(acc.maxBalanceAllowed) / 100 : 0;
        const standardCreditLimit = Math.min(
          Number(row.allowedCreditLimit ?? 0),
          Number(maxLimitLkr ?? 0)
        );
        const { accounts: _a, ...rest } = row;
        return {
          ...rest,
          maxCreditLimit: maxLimitLkr,
          standardCreditLimit,
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
