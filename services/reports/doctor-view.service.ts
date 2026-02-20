'use server';

import prisma from '@/lib/prisma';
import { DoctorViewReportQuery } from '@/types/report';

export type DoctorViewBookingData = {
  id: string;
  appointmentNo: number;
  title: string;
  name: string;
  status: number;
  receiptNoString: string | null;
  agencyRef: string | null;
  staffId: string | null;
  agencyId: string | null;
  professionalFee: number;
  amount: number;
  refund: number;
  staff?: {
    id: string;
    name: string;
  } | null;
  agency?: {
    id: string;
    name: string;
  } | null;
};

export type DoctorViewSessionData = {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location?: {
    id: string;
    name: string;
    address?: string | null;
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
  bookings: DoctorViewBookingData[];
};

// ==== GET DOCTOR VIEW REPORT DATA ==== //
export const getDoctorViewReportDataService = async ({
  sessionId
}: DoctorViewReportQuery) => {
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
            addressLine1: true,
            addressLine2: true,
            city: true,
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
          },
        },
        agency: {
          select: {
            id: true,
            name: true,
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

    // Build location address
    const locationAddress = session.location
      ? [
          session.location.addressLine1,
          session.location.addressLine2,
          session.location.city,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

    const sessionData: DoctorViewSessionData = {
      id: session.id,
      date: sessionDate,
      startTime,
      endTime,
      location: session.location
        ? {
            id: session.location.id,
            name: session.location.name,
            address: locationAddress || undefined,
          }
        : null,
      department: session.department,
      doctor: session.doctor,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        appointmentNo: booking.appointmentNo,
        title: booking.title,
        name: booking.name,
        status: booking.status,
        receiptNoString: booking.receiptNoString || null,
        agencyRef: booking.agencyRef || null,
        staffId: booking.staffId || null,
        agencyId: booking.agencyId || null,
        professionalFee: booking.professionalFee || 0,
        amount: booking.amount || 0,
        refund: booking.refund || 0,
        staff: booking.staff,
        agency: booking.agency,
      })),
    };

    return {
      success: true,
      data: sessionData,
      totalRecords: bookings.length,
    };
  } catch (error: unknown) {
    console.error('getDoctorViewReportDataService error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting doctor view report data';
    throw new Error(errorMessage);
  }
};
