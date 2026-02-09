"use server"

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import type { Session } from '@/types/booking.dashboard';

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