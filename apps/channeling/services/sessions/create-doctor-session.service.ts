'use server';

import prisma from '@/lib/prisma';
import { parseSessionDateTime } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import moment from 'moment';

const getDatesBetween = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  let current = moment(start).startOf('day');
  while (current.isSameOrBefore(end, 'day')) {
    dates.push(current.toDate());
    current = current.add(1, 'day');
  }
  return dates;
};

/** Day of week 1=Sun..7=Sat for a UTC calendar date string (matches analyse-sessions). */
function getDayTypeFromDateStr(dateStr: string): number {
  const d = moment.utc(dateStr, 'YYYY-MM-DD').day();
  return d === 0 ? 1 : d + 1;
}

/** Build session start/end as DateTime from date string + DoctorSession times (same as analyse). */
function sessionStartEndForDate(
  dateStr: string,
  dsStartTime: Date,
  dsEndTime: Date
): { startTime: Date; endTime: Date } {
  const startStr = moment(dsStartTime).utcOffset(330).format('HH:mm');
  const endStr = moment(dsEndTime).utcOffset(330).format('HH:mm');
  return {
    startTime: parseSessionDateTime(dateStr, startStr),
    endTime: parseSessionDateTime(dateStr, endStr),
  };
}

/**
 * Create Session records from DoctorSessions for a date range and optional doctor.
 * Uses createMany for bulk insert; does not use analyseSessionsHelper.
 */
export const createDoctorSessionService = async (
  payload: {
    fromDate: Date;
    toDate: Date;
  },
  doctorId?: string
) => {
  try {
    const todayStr = moment().format('YYYY-MM-DD');
    const fromStr = moment(payload.fromDate).format('YYYY-MM-DD');
    const toStr = moment(payload.toDate).format('YYYY-MM-DD');
    if (fromStr < todayStr) {
      throw new Error('From date cannot be in the past.');
    }
    if (toStr < todayStr) {
      throw new Error('To date cannot be in the past.');
    }
    if (toStr < fromStr) {
      throw new Error('To date must be on or after from date.');
    }

    // fromDate = start of day; toDate = end of day (inclusive full last day)
    const fromDateStart = moment(payload.fromDate).startOf('day').toDate();
    const toDateEnd = moment(payload.toDate).endOf('day').toDate();

    const doctors = doctorId
      ? [{ id: doctorId }]
      : await prisma.doctor.findMany({
          select: { id: true },
        });

    for (const doctor of doctors) {
      const doctorSessions = await prisma.doctorSession.findMany({
        where: {
          doctorId: doctor.id,
          status: 1,
        },
      });

      if (!doctorSessions.length) continue;

      const existingSessions = await prisma.session.findMany({
        where: {
          doctorId: doctor.id,
          date: {
            gte: fromDateStart,
            lte: toDateEnd,
          },
        },
        select: {
          date: true,
          doctorSessionId: true,
        },
      });

      const existingKeySet = new Set(
        existingSessions.map(
          (s) => `${moment(s.date).format('YYYY-MM-DD')}_${s.doctorSessionId}`
        )
      );

      const allDates = getDatesBetween(fromDateStart, toDateEnd);
      const sessionsToCreate: Prisma.SessionCreateManyInput[] = [];

      for (const date of allDates) {
        const dateStr = moment(date).format('YYYY-MM-DD');
        const dayType = getDayTypeFromDateStr(dateStr);

        for (const ds of doctorSessions) {
          if (ds.dayType !== dayType) continue;

          const key = `${dateStr}_${ds.id}`;
          if (existingKeySet.has(key)) continue;

          const { startTime, endTime } = sessionStartEndForDate(
            dateStr,
            ds.startTime,
            ds.endTime
          );
          const sessionDate = moment.utc(dateStr, 'YYYY-MM-DD').startOf('day').toDate();
          sessionsToCreate.push({
            institution: ds.institution,
            date: sessionDate,
            doctorSessionId: ds.id,
            startTime,
            endTime,
            durationMinutes: ds.durationMinutes,
            startingPatientNumber: ds.startingPatientNumber,
            maxPatientNumber: ds.maxPatientNumber,
            refundable: ds.refundable,
            fees: (ds.fees ?? {}) as Prisma.InputJsonValue,
            amountLocal: ds.amountLocal ?? undefined,
            amountForeign: ds.amountForeign ?? undefined,
            status: 1,
            doctorId: ds.doctorId,
            departmentId: ds.departmentId,
            locationId: ds.locationId,
            roomId: ds.roomId,
          });
        }
      }

      if (sessionsToCreate.length) {
        await prisma.session.createMany({
          data: sessionsToCreate,
        });
      }
    }

    return { status: true };
  } catch (error) {
    console.error('createDoctorSessionService error', error);
    throw error;
  }
};
