'use server';

import prisma from '@/lib/prisma';
import { PhoneViewReportQuery } from '@/types/report';

export type PhoneViewBookingData = {
  id: string;
  appointmentNo: number;
  bookingId: string;
  title: string;
  name: string;
  phone: string;
  status: number;
  refund: number;
  refundReceiptCreatedAt?: Date | null;
};

export type PhoneViewSessionData = {
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
  bookings: PhoneViewBookingData[];
};

// ==== GET PHONE VIEW REPORT DATA ==== //
export const getPhoneViewReportDataService = async ({
  sessionId
}: PhoneViewReportQuery) => {
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
      select: {
        id: true,
        appointmentNo: true,
        receiptNoString: true,
        title: true,
        name: true,
        phone: true,
        status: true,
        refund: true,
        refundReceiptCreatedAt: true,
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

    const sessionData: PhoneViewSessionData = {
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
        bookingId: booking.receiptNoString || booking.id,
        title: booking.title,
        name: booking.name,
        phone: booking.phone || '',
        status: booking.status,
        refund: booking.refund || 0,
        refundReceiptCreatedAt: booking.refundReceiptCreatedAt ?? null,
      })),
    };

    return {
      success: true,
      data: sessionData,
      totalRecords: bookings.length,
    };
  } catch (error: unknown) {
    console.error('getPhoneViewReportDataService error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting phone view report data';
    throw new Error(errorMessage);
  }
};
