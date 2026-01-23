'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { DoctorReportQuery } from '@/types/report';

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
