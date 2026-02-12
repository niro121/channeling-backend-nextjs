'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { DoctorReportQuery, DoctorArrivalsReportQuery } from '@/types/report';
import moment from 'moment';

// ==== GET DOCTOR REPORT DATA ==== //
export const getDoctorReportDataService = async ({
  date,
  doctorName,
  doctorCode
}: DoctorReportQuery) => {
  try {
    // Build where clause for filtering
    const whereClause: Prisma.DoctorWhereInput = {};

    // Apply doctor name filter
    if (doctorName && doctorName.trim() !== '') {
      whereClause.name = {
        contains: doctorName.trim(),
        mode: Prisma.QueryMode.insensitive
      };
    }

    // Apply doctor code filter
    if (doctorCode && doctorCode.trim() !== '') {
      whereClause.code = {
        contains: doctorCode.trim(),
        mode: Prisma.QueryMode.insensitive
      };
    }

    // Fetch all doctors with their related data in a single query
    // Note: Date filter is for future use with sessions/transactions
    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        createdUser: true,
        updatedUser: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      success: true,
      data: doctors,
      totalRecords: doctors.length
    };
  } catch (error: any) {
    console.error('getDoctorReportDataService error', error);
    throw new Error(error.message ?? 'Error getting doctor report data');
  }
};

// ==== GET DOCTOR ARRIVALS REPORT DATA ==== //
export const getDoctorArrivalsReportDataService = async ({
  doctorId,
  locationId,
  fromDate,
  toDate
}: DoctorArrivalsReportQuery) => {
  try {
    // Parse dates
    const fromDateObj = typeof fromDate === 'string' ? new Date(fromDate) : fromDate;
    const toDateObj = typeof toDate === 'string' ? new Date(toDate) : toDate;

    const fromDateStart = moment(fromDateObj).startOf('day').toDate();
    const toDateEnd = moment(toDateObj).endOf('day').toDate();

    // Build where clause
    const whereClause: Prisma.SessionWhereInput = {
      date: {
        gte: fromDateStart,
        lte: toDateEnd
      }
    };

    // Apply doctor filter
    if (doctorId) {
      whereClause.doctorId = doctorId;
    }

    // Apply location filter
    if (locationId) {
      whereClause.locationId = locationId;
    }

    // Fetch sessions with related data
    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        doctor: true,
        location: true,
        room: true,
        createdUser: true,
        updatedUser: true
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return {
      success: true,
      data: sessions,
      totalRecords: sessions.length
    };
  } catch (error: any) {
    console.error('getDoctorArrivalsReportDataService error', error);
    throw new Error(error.message ?? 'Error getting doctor arrivals report data');
  }
};
