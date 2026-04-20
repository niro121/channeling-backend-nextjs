'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import type { ChannelTransferReportQuery, ChannelTransferReportRow } from '@/types/reports/channel-transfer';

const ACTION_TRANSFER = 'booking.transferred';
const MAX_RANGE_DAYS = getReportMaxRangeDays('channel_transfer', 31);
const MAX_RECORDS = getReportMaxRecords('channel_transfer', 10000);

function parseDateTime(value: string, asEnd: boolean): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const [y, m, d] = trimmed.split('-').map(Number);
  if (!y || !m || !d) return null;
  if (asEnd) return new Date(y, m - 1, d, 23, 59, 59, 999);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function parseFromTo(dateFrom: string, dateTo: string): { start: Date; end: Date } | null {
  const start = parseDateTime(dateFrom, false);
  const end = parseDateTime(dateTo, true);
  if (!start || !end) return null;
  return { start, end };
}

function isObjectId(v: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

export async function getChannelTransferReportService(
  query: ChannelTransferReportQuery
): Promise<{ success: boolean; data: ChannelTransferReportRow[]; totalRecords: number; message?: string }> {
  const range = parseFromTo(query.dateFrom, query.dateTo);
  if (!range) {
    return { success: false, data: [], totalRecords: 0, message: 'From date and to date are required.' };
  }
  const from = range.start;
  const to = range.end;
  if (from.getTime() > to.getTime()) {
    return { success: false, data: [], totalRecords: 0, message: 'From date must be before or equal to to date.' };
  }
  const daySpan = getInclusiveDaySpan(from, to);
  if (daySpan > MAX_RANGE_DAYS) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
    };
  }

  const fromSessionId = (query.fromSessionId ?? '__all__').trim();
  const toSessionId = (query.toSessionId ?? '__all__').trim();
  const branchId = (query.branchId ?? '__all__').trim();
  const fromSpecialityId = (query.fromSpecialityId ?? '__all__').trim();
  const toSpecialityId = (query.toSpecialityId ?? '__all__').trim();
  const fromDoctorIdFilter = (query.fromDoctorId ?? '__all__').trim();
  const toDoctorIdFilter = (query.toDoctorId ?? '__all__').trim();
  const transferredByUserId = (query.transferredByUserId ?? '__all__').trim();
  const bookingSearch = (query.bookingId ?? '').trim();

  const where: any = {
    action: ACTION_TRANSFER,
    entityType: 'Booking',
    createdAt: { gte: from, lte: to },
  };
  if (bookingSearch) {
    const bookingNo = Number.parseInt(bookingSearch, 10);
    const bookingMatches = await prisma.booking.findMany({
      where: {
        OR: [
          ...(isObjectId(bookingSearch) ? [{ id: bookingSearch }] : []),
          { bookingid_string: { contains: bookingSearch } },
          { receiptNoString: { contains: bookingSearch } },
          ...(Number.isFinite(bookingNo) ? [{ appointmentNo: bookingNo }] : []),
        ],
      },
      select: { id: true },
      take: 250,
    });
    const matchedBookingIds = Array.from(new Set(bookingMatches.map((b) => b.id).filter(Boolean)));
    if (matchedBookingIds.length === 0) {
      return { success: true, data: [], totalRecords: 0, message: 'No transfers found for the provided booking reference.' };
    }
    where.entityId = { in: matchedBookingIds };
  }

  // NOTE: Prisma Mongo JSON path filtering isn't supported consistently across versions.
  // We fetch by date/action and then filter by from/to session id in-memory below.

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: MAX_RECORDS + 1,
    include: { user: { select: { name: true, staff: { select: { code: true } } } } },
  });

  const hasMore = logs.length > MAX_RECORDS;
  const sliced = hasMore ? logs.slice(0, MAX_RECORDS) : logs;

  const bookingIds = Array.from(
    new Set(
      sliced
        .map((l) => l.entityId)
        .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    )
  );

  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    select: {
      id: true,
      locationId: true,
      bookingid_string: true,
      receiptNoString: true,
      amount: true,
      appointmentNo: true,
      sessionStartTime: true,
      movedFromSessionId: true,
      movedFromSessionStartTime: true,
      movedAt: true,
      movedBy: true,
      movedRemarks: true,
      createdAt: true,
      createdUser: { select: { name: true, staff: { select: { code: true } } } },
      session: {
        select: {
          id: true,
          locationId: true,
          doctorId: true,
          date: true,
          startTime: true,
          doctor: { select: { title: true, name: true, code: true, specialityId: true, speciality: { select: { name: true } } } },
        },
      },
      movedFromSession: {
        select: {
          id: true,
          locationId: true,
          doctorId: true,
          date: true,
          startTime: true,
          doctor: { select: { title: true, name: true, code: true, specialityId: true, speciality: { select: { name: true } } } },
        },
      },
    },
  });
  const bookingById = new Map(bookings.map((b) => [b.id, b]));

  const data: ChannelTransferReportRow[] = sliced
    .map((log) => {
      const md = (log.metadata ?? null) as Record<string, unknown> | null;
      const b = bookingById.get(log.entityId ?? '') ?? null;
      const fromId = (md?.fromSessionId as string | undefined) ?? b?.movedFromSessionId ?? null;
      const toId = (md?.toSessionId as string | undefined) ?? b?.session?.id ?? null;

      const beforeActivity = typeof md?.before === 'string' ? md.before : null;
      const afterActivity = typeof md?.after === 'string' ? md.after : null;
      const fromSpeciality = b?.movedFromSession?.doctor?.specialityId ?? null;
      const toSpeciality = b?.session?.doctor?.specialityId ?? null;
      const branch = b?.locationId ?? b?.session?.locationId ?? b?.movedFromSession?.locationId ?? null;

      return {
        id: log.id,
        transferredAt: log.createdAt,
        transferredByUserId: log.userId,
        transferredByUserName: formatUserDisplayName(log.user?.name, log.userId, log.user?.staff?.code),

        bookingId: log.entityId ?? (md?.bookingId as string | undefined) ?? '',
        bookingDisplayId: b?.bookingid_string ?? b?.receiptNoString ?? (log.entityId ?? null),

        fromSessionId: fromId,
        fromDoctorId: b?.movedFromSession?.doctorId ?? null,
        fromSpecialityId: fromSpeciality,
        beforeActivity,

        toSessionId: toId,
        toDoctorId: b?.session?.doctorId ?? null,
        toSpecialityId: toSpeciality,
        afterActivity,
        branchId: branch,

        remarks: (md?.remarks as string | undefined) ?? b?.movedRemarks ?? null,
        metadata: md,
      };
    })
    .filter((row) => {
      if (fromSessionId && fromSessionId !== '__all__' && row.fromSessionId !== fromSessionId) return false;
      if (toSessionId && toSessionId !== '__all__' && row.toSessionId !== toSessionId) return false;
      if (branchId && branchId !== '__all__' && row.branchId !== branchId) return false;
      if (fromSpecialityId && fromSpecialityId !== '__all__' && row.fromSpecialityId !== fromSpecialityId) return false;
      if (toSpecialityId && toSpecialityId !== '__all__' && row.toSpecialityId !== toSpecialityId) return false;
      if (fromDoctorIdFilter && fromDoctorIdFilter !== '__all__' && row.fromDoctorId !== fromDoctorIdFilter) return false;
      if (toDoctorIdFilter && toDoctorIdFilter !== '__all__' && row.toDoctorId !== toDoctorIdFilter) return false;
      if (transferredByUserId && transferredByUserId !== '__all__' && row.transferredByUserId !== transferredByUserId) return false;
      return true;
    });

  return {
    success: true,
    data,
    totalRecords: data.length,
    message: hasMore ? `More than ${MAX_RECORDS} records exist for this range. Showing first ${MAX_RECORDS}.` : undefined,
  };
}

