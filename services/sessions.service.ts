'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import moment from 'moment';

// ==== CREATE DOCTOR SESSIONS FOR ALL/SPECIFIC DOCTOR(S) ==== //
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
  // == CONVERT TO 1-7 == //
  return moment(date).day() + 1;
};

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

    // == RESOLVE DOCTORS == //
    const doctors = doctorId
      ? [{ id: doctorId }]
      : await prisma.doctor.findMany({
          select: { id: true }
        });

    for (const doctor of doctors) {
      // == GET PUBLISHED DOCTOR SESSIONS == //
      const doctorSessions = await prisma.doctorSession.findMany({
        where: {
          doctorId: doctor.id,
          status: 1
        }
      });

      if (!doctorSessions.length) continue;

      // == FETCH EXISTING SESSIONS IN DATE RANGE (ONCE PER DOCTOR) == //
      const existingSessions = await prisma.session.findMany({
        where: {
          doctorId: doctor.id,
          date: {
            gte: fromDateStart,
            lte: toDateEnd
          }
        },
        select: {
          date: true,
          doctorSessionId: true
        }
      });

      // == LOOKUP: date+doctorSessionId == //
      const existingKeySet = new Set(
        existingSessions.map(
          (s) => `${moment(s.date).format('YYYY-MM-DD')}_${s.doctorSessionId}`
        )
      );

      const allDates = getDatesBetween(fromDateStart, toDateEnd);
      const sessionsToCreate: Prisma.SessionCreateManyInput[] = [];

      // == GENERATE MISSING SESSIONS == //
      for (const date of allDates) {
        const dayType = getDayType(date);

        for (const ds of doctorSessions) {
          if (ds.dayType !== dayType) continue;

          const key = `${moment(date).format('YYYY-MM-DD')}_${ds.id}`;
          if (existingKeySet.has(key)) continue; // == SKIP EXISTING == //

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
            roomId: ds.roomId
          });
        }
      }

      // == BULK SESSIONS CREATE == //
      if (sessionsToCreate.length) {
        await prisma.session.createMany({
          data: sessionsToCreate
        });
      }
    }

    return { status: true };
  } catch (error) {
    console.error('createDoctorSessionService error', error);
    throw error;
  }
};

// ==== GET DOCTOR OPTIONS ==== //
export const getDoctorOptionsService = async () => {
  try {
    const records = await prisma.doctor.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true
      }
    });

    const totalRecords = await prisma.doctor.count({
      where: { status: 1 }
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getDoctorOptionsService error', error);
    throw error;
  }
};
