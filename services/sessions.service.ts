'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import type { Session } from '@/types/sessions';

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

// ==== GET SESSIONS FOR CHANNEL BOOKING ==== //
/** Fetches Session records (bookable sessions) for a doctor on a given date, optionally by location. */
export const getSessionsForChannelBookingService = async (
  doctorId: string,
  date: Date | string,
  locationId?: string | null
): Promise<{ success: boolean; data?: Session[]; message?: string; error?: { message?: string } }> => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dayStart = moment(dateObj).startOf('day').toDate();
    const dayEnd = moment(dateObj).endOf('day').toDate();

    const where: Prisma.SessionWhereInput = {
      doctorId,
      date: { gte: dayStart, lte: dayEnd },
      status: 1
    };
    if (locationId) {
      where.locationId = locationId;
    }

    const records = await prisma.session.findMany({
      where,
      include: {
        doctor: {
          select: { id: true, title: true, name: true }
        },
        location: true,
        room: true
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });

    const data = records.map((r) => ({
      id: r.id,
      institution: r.institution,
      date: r.date,
      doctorSessionId: r.doctorSessionId,
      previousDoctorSession: r.previousDoctorSession,
      startTime: r.startTime,
      endTime: r.endTime,
      durationMinutes: r.durationMinutes,
      startingPatientNumber: r.startingPatientNumber,
      maxPatientNumber: r.maxPatientNumber,
      refundable: r.refundable,
      fees: r.fees,
      amountLocal: r.amountLocal,
      amountForeign: r.amountForeign,
      status: r.status,
      remarks: r.remarks,
      appointmentNo: r.appointmentNo,
      isScan: r.isScan,
      doctorId: r.doctorId,
      departmentId: r.departmentId,
      locationId: r.locationId,
      roomId: r.roomId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      doctor: r.doctor ?? undefined,
      location: r.location ?? undefined,
      room: r.room ?? undefined
    })) as Session[];

    return { success: true, data };
  } catch (error: any) {
    console.error('getSessionsForChannelBookingService error', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to fetch sessions',
      error: { message: error?.message }
    };
  }
};

// ==== GET SESSIONS ==== //
export const getAllSessionsService = async ({
  page,
  limit,
  date,
  doctorId
}: {
  page: number;
  limit: number;
  date?: Date;
  doctorId?: string;
}): Promise<{
  success: boolean;
  data?: {
    records: any[];
    totalRecords: number;
  };
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  const skip = page * limit;

  try {
    // Build where clause based on filters
    // Logic:
    // - If only date: filter by date
    // - If both date and doctor: filter by both
    // - If only doctor: filter by doctor but only show today's sessions
    const whereClause: Prisma.SessionWhereInput = {};

    if (date && doctorId) {
      // Both filters: filter by both date and doctor
      const dateMoment = moment(date);
      const dateStart = dateMoment.startOf('day').toDate();
      const dateEnd = dateMoment.endOf('day').toDate();
      whereClause.date = {
        gte: dateStart,
        lte: dateEnd
      };
      whereClause.doctorId = doctorId;
    } else if (date) {
      // Only date filter: filter by date only
      const dateMoment = moment(date);
      const dateStart = dateMoment.startOf('day').toDate();
      const dateEnd = dateMoment.endOf('day').toDate();
      whereClause.date = {
        gte: dateStart,
        lte: dateEnd
      };
    } else if (doctorId) {
      // Only doctor filter: filter by doctor but only show today's sessions
      const todayStart = moment().startOf('day').toDate();
      const todayEnd = moment().endOf('day').toDate();
      whereClause.doctorId = doctorId;
      whereClause.date = {
        gte: todayStart,
        lte: todayEnd
      };
    }

    const records = await prisma.session.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: true,
        department: true,
        location: true,
        room: true,
        createdUser: true,
        updatedUser: true
      }
    });

    const totalRecords = await prisma.session.count({
      where: whereClause
    });

    return {
      success: true,
      data: {
        records,
        totalRecords
      },
      message: 'Sessions fetched successfully'
    };
  } catch (error: any) {
    console.error('getAllSessionsService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch sessions'
      }
    };
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
