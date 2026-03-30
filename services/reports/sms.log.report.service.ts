"use server"

import prisma from '@/lib/prisma';
import {SmsLogReportQuery} from '@/types/reports/sms.log'
import { Prisma } from '@prisma/client';
import { SL_OFFSET } from '@/lib/utils';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';

const MAX_RANGE_DAYS = getReportMaxRangeDays('sms_log', 31);
const MAX_RECORDS_SCAN = getReportMaxRecords('sms_log', 50000);

// ==== GET SMS LOGS FOR REPORT ==== //
export const getSmsLogReportService = async ({
  fromDateTime,
  toDateTime,
  institutionId,
  locationId,
  departmentId,
  reportType,
  phoneNo
}: SmsLogReportQuery): Promise<{
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

    // Do not fetch data when no filters are applied
    const hasAnyFilter =
      hasDateFilter ||
      (reportType && reportType !== '__all__' && reportType !== 'all') ||
      (phoneNo && phoneNo.trim() !== '');
    
    // Note: institutionId, locationId, and departmentId filters are not applicable
    // to SmsLog as it doesn't have direct relations to these entities
    // These filters are kept in UI for consistency but won't affect the query

    if (!hasAnyFilter) {
      return { success: true, data: [], totalRecords: 0 };
    }

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (hasDateFilter) {
      // Date-only (YYYY-MM-DD): use start of day for from, end of day for to
      // DateTime (YYYY-MM-DDTHH:mm): parse as Sri Lanka time for correct comparison with DB (UTC)
      const parseFromDate = (val: string): Date => {
        const trimmed = val.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          return new Date(`${trimmed}T00:00:00${SL_OFFSET}`);
        }
        if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(:\d{2})?/.test(trimmed)) {
          const base = trimmed.replace(/Z$/i, '').split(':').slice(0, 2).join(':');
          return new Date(`${base}:00${SL_OFFSET}`);
        }
        return new Date(trimmed);
      };
      const parseToDate = (val: string): Date => {
        const trimmed = val.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          return new Date(`${trimmed}T23:59:59.999${SL_OFFSET}`);
        }
        if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(:\d{2})?/.test(trimmed)) {
          const [datePart, timePart] = trimmed.split('T');
          const [h = 23, min = 59] = (timePart || '').split(':').map(Number);
          // End of selected hour: e.g. "2:00 PM" -> 2:59:59.999 PM (inclusive of full hour)
          const base = `${datePart}T${h.toString().padStart(2, '0')}:59:59.999`;
          return new Date(`${base}${SL_OFFSET}`);
        }
        return new Date(trimmed);
      };
      fromDate = parseFromDate(fromDateTime!);
      toDate = parseToDate(toDateTime!);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
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

    const smsLogWhere: Prisma.SmsLogWhereInput = {};
    
    // Date filter
    if (fromDate != null && toDate != null) {
      smsLogWhere.createdAt = {
        gte: fromDate,
        lte: toDate
      };
    }

    // Report type filter (status: 0 = Sent, 1 = Failure)
    if (reportType && reportType !== '__all__' && reportType !== 'all') {
      if (reportType === 'sent') {
        smsLogWhere.status = 0;
      } else if (reportType === 'fail') {
        smsLogWhere.status = 1;
      }
    }

    // Phone number filter
    if (phoneNo && phoneNo.trim() !== '') {
      smsLogWhere.phone = {
        contains: phoneNo.trim(),
        mode: 'insensitive'
      };
    }

    const totalCount = await prisma.smsLog.count({ where: smsLogWhere });
    if (totalCount > MAX_RECORDS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: `Too many records in selected range (${totalCount}). Please narrow filters/date range.` }
      };
    }
    const records = await prisma.smsLog.findMany({
      where: smsLogWhere,
      orderBy: { createdAt: 'desc' }
    });

    // Map records to report format
    const enrichedRecords = records.map((rec: any) => {
      const name = rec.status === 0 ? 'SMS Sent' : 'SMS Failure';
      const count = rec.status === 0 ? 1 : 0;
      
      return {
        ...rec,
        name,
        count
      };
    });

    return {
      success: true,
      data: enrichedRecords,
      totalRecords: totalCount
    };
  } catch (error: any) {
    console.error('getSmsLogReportService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? 'Failed to fetch SMS log report' }
    };
  }
};
