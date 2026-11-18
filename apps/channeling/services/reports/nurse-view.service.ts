'use server';

import prisma from '@/lib/prisma';
import { NurseViewReportQuery } from '@/types/report';
import moment from 'moment';

// Get Prisma types from the prisma instance
type ExtractWhereInput<T> = T extends { where?: infer W } ? W : never;
type PrismaBookingWhereInput = ExtractWhereInput<NonNullable<Parameters<typeof prisma.booking.findMany>[0]>>;

export type NurseViewBookingData = {
  id: string;
  appointmentNo: number;
  title: string;
  name: string;
  status: number;
  remarks: string;
  area: string;
  agencyRef: string | null;
  staffId: string | null;
  agencyId: string | null;
  creditCustomerId: string | null;
  staff?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  agency?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  creditCustomer?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
};

export type NurseViewSessionData = {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location?: {
    id: string;
    name: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  doctor?: {
    id: string;
    title: string;
    name: string;
  } | null;
  bookings: NurseViewBookingData[];
};

// ==== GET NURSE VIEW REPORT DATA ==== //
export const getNurseViewReportDataService = async ({
  sessionId
}: NurseViewReportQuery) => {
  try {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        doctor: {
          select: {
            id: true,
            title: true,
            name: true,
          },
        },
      },
    });

    if (!session) {
      return {
        success: true,
        data: null,
        totalRecords: 0,
      };
    }

    // Fetch bookings for this session
    const bookings = await prisma.booking.findMany({
      where: { sessionId },
      orderBy: { appointmentNo: 'asc' },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        agency: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        creditCustomer: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Format session data
    const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
    const startTime = session.startTime instanceof Date 
      ? session.startTime 
      : (() => {
          const n = Number(session.startTime);
          if (n >= 1e9 && n < 1e13) return new Date(n * 1000);
          const t = new Date(sessionDate);
          t.setUTCHours(Math.floor(n / 60), n % 60, 0, 0);
          return t;
        })();
    const endTime = session.endTime instanceof Date 
      ? session.endTime 
      : (() => {
          const n = Number(session.endTime);
          if (n >= 1e9 && n < 1e13) return new Date(n * 1000);
          const t = new Date(sessionDate);
          t.setUTCHours(Math.floor(n / 60), n % 60, 0, 0);
          return t;
        })();

    const sessionData: NurseViewSessionData = {
      id: session.id,
      date: sessionDate,
      startTime,
      endTime,
      location: session.location,
      department: session.department,
      doctor: session.doctor,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        appointmentNo: booking.appointmentNo,
        title: booking.title,
        name: booking.name,
        status: booking.status,
        remarks: booking.remarks || '',
        area: booking.area || '',
        agencyRef: booking.agencyRef || null,
        staffId: booking.staffId || null,
        agencyId: booking.agencyId || null,
        creditCustomerId: booking.creditCustomerId || null,
        staff: booking.staff,
        agency: booking.agency,
        creditCustomer: booking.creditCustomer,
      })),
    };

    return {
      success: true,
      data: sessionData,
      totalRecords: bookings.length,
    };
  } catch (error: unknown) {
    console.error('getNurseViewReportDataService error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting nurse view report data';
    throw new Error(errorMessage);
  }
};
