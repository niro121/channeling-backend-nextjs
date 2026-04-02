'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import type { ChannelTransferReportQuery, ChannelTransferReportRow } from '@/types/reports/channel-transfer';

const ACTION_TRANSFER = 'booking.transferred';
const MAX_RANGE_DAYS = getReportMaxRangeDays('channel_transfer', 31);
const MAX_RECORDS = getReportMaxRecords('channel_transfer', 10000);

function parseLocalDay(dateStr: string): { start: Date; end: Date } | null {
  const s = (dateStr ?? '').trim();
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
}

// NOTE: keep mapping simple; report displays ActivityLog before/after strings.

export async function getChannelTransferReportService(
  query: ChannelTransferReportQuery
): Promise<{ success: boolean; data: ChannelTransferReportRow[]; totalRecords: number; message?: string }> {
  const fromParsed = parseLocalDay(query.dateFrom);
  const toParsed = parseLocalDay(query.dateTo);
  if (!fromParsed || !toParsed) {
    return { success: false, data: [], totalRecords: 0, message: 'From date and to date are required.' };
  }
  const from = fromParsed.start;
  const to = toParsed.end;
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
  const fromDoctorIdFilter = (query.fromDoctorId ?? '__all__').trim();
  const toDoctorIdFilter = (query.toDoctorId ?? '__all__').trim();
  const transferredByUserId = (query.transferredByUserId ?? '__all__').trim();
  const bookingId = (query.bookingId ?? '').trim();

  const where: any = {
    action: ACTION_TRANSFER,
    entityType: 'Booking',
    createdAt: { gte: from, lte: to },
  };
  if (bookingId) {
    where.entityId = bookingId;
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
          doctorId: true,
          date: true,
          startTime: true,
          doctor: { select: { title: true, name: true, code: true, speciality: { select: { name: true } } } },
        },
      },
      movedFromSession: {
        select: {
          id: true,
          doctorId: true,
          date: true,
          startTime: true,
          doctor: { select: { title: true, name: true, code: true, speciality: { select: { name: true } } } },
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

      return {
        id: log.id,
        transferredAt: log.createdAt,
        transferredByUserId: log.userId,
        transferredByUserName: formatUserDisplayName(log.user?.name, log.userId, log.user?.staff?.code),

        bookingId: log.entityId ?? (md?.bookingId as string | undefined) ?? '',

        fromSessionId: fromId,
        fromDoctorId: b?.movedFromSession?.doctorId ?? null,
        beforeActivity,

        toSessionId: toId,
        toDoctorId: b?.session?.doctorId ?? null,
        afterActivity,

        remarks: (md?.remarks as string | undefined) ?? b?.movedRemarks ?? null,
        metadata: md,
      };
    })
    .filter((row) => {
      if (fromSessionId && fromSessionId !== '__all__' && row.fromSessionId !== fromSessionId) return false;
      if (toSessionId && toSessionId !== '__all__' && row.toSessionId !== toSessionId) return false;
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

