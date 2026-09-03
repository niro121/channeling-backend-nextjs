"use server"

import prisma from '@/lib/prisma';
import { ApiLogReportQuery } from '@/types/reports/api.log';
import { Prisma } from '@prisma/client';
import { SL_OFFSET } from '@/lib/utils';
import { parseReportDateTimeSl } from '@/lib/parse-report-datetime';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';

const MAX_RANGE_DAYS = getReportMaxRangeDays('api_log', 31);
const MAX_RECORDS_SCAN = getReportMaxRecords('api_log', 20000);

// ==== GET API LOGS FOR REPORT ==== //
export const getApiLogReportService = async ({
  fromDateTime,
  toDateTime,
  uuid
}: ApiLogReportQuery): Promise<{
  success: boolean;
  data?: any[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    // Date range is optional: when both are empty, no date filter is applied
    const hasDateFilter =
      Boolean(fromDateTime?.trim()) && Boolean(toDateTime?.trim());

    // UUID filter
    const hasUuidFilter = Boolean(uuid?.trim());

    // Do not fetch data when no filters are applied
    const hasAnyFilter = hasDateFilter || hasUuidFilter;
    if (!hasAnyFilter) {
      return { success: true, data: [], totalRecords: 0 };
    }

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (hasDateFilter) {
      fromDate = parseReportDateTimeSl(fromDateTime!, false, SL_OFFSET);
      toDate = parseReportDateTimeSl(toDateTime!, true, SL_OFFSET);

      if (!fromDate || !toDate || isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: 'Invalid date format' }
        };
      }
      const daySpan = getInclusiveDaySpan(fromDate, toDate);
      if (daySpan > MAX_RANGE_DAYS) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` }
        };
      }
    }

    // Build where clause for Log model
    // Log model fields: id, status (INFO/ERROR), name, description, before, after, createdAt
    const logWhere: Prisma.LogWhereInput = {};

    if (fromDate != null && toDate != null) {
      logWhere.createdAt = {
        gte: fromDate,
        lte: toDate
      };
    }

    if (hasUuidFilter && uuid) {
      // Search UUID in name or description fields (case-insensitive)
      const uuidSearch = uuid.trim();
      logWhere.OR = [
        { name: { contains: uuidSearch, mode: 'insensitive' } },
        { description: { contains: uuidSearch, mode: 'insensitive' } }
      ];
    }

    const totalCount = await prisma.log.count({ where: logWhere });
    if (totalCount > MAX_RECORDS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: `Too many records in selected range (${totalCount}). Please narrow filters/date range.` }
      };
    }
    const records = await prisma.log.findMany({
      where: logWhere,
      orderBy: { createdAt: 'desc' }
    });

    // Map Log model fields to API log report format
    // Log.name -> endpoint, Log.status -> errorStatus, Log.before -> requestBody, Log.after -> responseBody
    // Log.description might contain UUID or other details
    const mappedRecords = records.map((record) => ({
      id: record.id,
      createdAt: record.createdAt,
      duration: null, // Not available in Log model
      endpoint: record.name || '-',
      uuid: record.description || null, // Assuming UUID might be in description
      errorStatus: record.status === 'ERROR',
      requestBody: record.before || null,
      responseBody: record.after || null
    }));

    return {
      success: true,
      data: mappedRecords,
      totalRecords: totalCount
    };

  } catch (error: any) {
    console.error('getApiLogReportService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? 'Failed to fetch API log report' }
    };
  }
};
