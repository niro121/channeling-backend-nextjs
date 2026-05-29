"use server"

import prisma from '@/lib/prisma';
import {SmsLogReportQuery} from '@/types/reports/sms.log'
import { Prisma } from '@prisma/client';
import { SL_OFFSET } from '@/lib/utils';
import { parseReportDateTimeSl } from '@/lib/parse-report-datetime';
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
