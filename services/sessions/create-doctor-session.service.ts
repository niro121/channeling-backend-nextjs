'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import moment from 'moment';

const getDatesBetween = (start: Date, end: Date) => {
  const dates: Date[] = [];
  let current = moment(start).startOf('day');

  while (current.isSameOrBefore(end, 'day')) {
    dates.push(current.toDate());
    current = current.add(1, 'day');
  }

  return dates;
};

const getDayType = (date: Date): number => {
  return moment(date).day() + 1;
};

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
        const dayType = getDayType(date);

        for (const ds of doctorSessions) {
          if (ds.dayType !== dayType) continue;

          const key = `${moment(date).format('YYYY-MM-DD')}_${ds.id}`;
          if (existingKeySet.has(key)) continue;

          sessionsToCreate.push({
            institution: ds.institution,
            date,
            doctorSessionId: ds.id,
            startTime:
              moment(ds.startTime).hours() * 60 +
              moment(ds.startTime).minutes(),
            endTime:
              moment(ds.endTime).hours() * 60 + moment(ds.endTime).minutes(),
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
