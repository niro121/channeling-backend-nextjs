"use server";

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  ChannelScheduleWithChargesReportQuery,
  ChannelScheduleWithChargesReportRow
} from '@/types/reports/channel-schedule-with-charges';

export async function getChannelScheduleWithChargesReportService(
  query: ChannelScheduleWithChargesReportQuery
): Promise<{
  success: boolean;
  data?: ChannelScheduleWithChargesReportRow[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const {
      institutionId,
      locationId,
      departmentId,
      specialityId,
      doctorId,
      reportType
    } = query;

    const trimmedDoctorId = doctorId?.trim();
    const hasAnyFilter =
      Boolean(institutionId && institutionId !== '__all__' && institutionId !== '') ||
      Boolean(locationId && locationId !== '__all__' && locationId !== '') ||
      Boolean(departmentId && departmentId !== '__all__' && departmentId !== '') ||
      Boolean(specialityId && specialityId !== '__all__' && specialityId !== '') ||
      Boolean(trimmedDoctorId && trimmedDoctorId !== '__all__') ||
      Boolean(reportType && reportType !== '__all__' && reportType !== '');

    if (!hasAnyFilter) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const where: Prisma.DoctorSessionWhereInput = {};

    // Institution
    if (institutionId && institutionId !== '__all__' && institutionId !== '') {
      const instNum = parseInt(institutionId, 10);
      if (!isNaN(instNum)) where.institution = instNum;
    }

    // Branch (Location)
    if (locationId && locationId !== '__all__' && locationId !== '') {
      where.locationId = locationId;
    }

    // Department
    if (departmentId && departmentId !== '__all__' && departmentId !== '') {
      where.departmentId = departmentId;
    }

    // Report Type filter
    if (reportType && reportType !== '__all__') {
      if (reportType === 'specific_date') {
        // Apply-to sessions are treated as "Specific Date"
        where.applyTo = { not: null };
      } else if (reportType === 'weekday') {
        where.dayType = { in: [1, 2, 3, 4, 5, 6, 7] };
        where.applyTo = null;
      }
    }

    // Speciality => DoctorSession.doctorId in doctors with that speciality
    let specialityDoctorIds: string[] | null = null;
    if (specialityId && specialityId !== '__all__' && specialityId !== '') {
      const doctors = await prisma.doctor.findMany({
        where: { specialityId },
        select: { id: true }
      });
      specialityDoctorIds = doctors.map((d) => d.id).filter(Boolean);
      if (specialityDoctorIds.length === 0) {
        return { success: true, data: [], totalRecords: 0 };
      }
    }

    // Doctor filter
    const hasExplicitDoctor = Boolean(
      trimmedDoctorId && trimmedDoctorId !== '__all__'
    );

    if (hasExplicitDoctor) {
      if (specialityDoctorIds) {
        specialityDoctorIds = specialityDoctorIds.filter(
          (id) => id === trimmedDoctorId
        );
      } else {
        specialityDoctorIds = [trimmedDoctorId as string];
      }
    }

    if (specialityDoctorIds && specialityDoctorIds.length > 0) {
      where.doctorId = { in: specialityDoctorIds };
    } else if (specialityDoctorIds && specialityDoctorIds.length === 0) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const sessions = await prisma.doctorSession.findMany({
      where,
      orderBy: [{ dayType: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }],
      include: {
        doctor: { select: { id: true, name: true, code: true, title: true } },
        location: { select: { id: true, name: true } },
        room: { select: { id: true, number: true, description: true } },
        department: { select: { id: true, name: true } },
        previousSession: { select: { id: true, name: true } }
      }
    });

    // Normalize JSON fees to an array
    const rows: ChannelScheduleWithChargesReportRow[] = sessions.map((s: any) => ({
      ...s,
      fees: Array.isArray(s.fees) ? s.fees : []
    }));

    return { success: true, data: rows, totalRecords: rows.length };
  } catch (error: unknown) {
    console.error(
      'getChannelScheduleWithChargesReportService error:',
      error
    );
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch channel schedule with charges report'
      }
    };
  }
}

