"use server"

import prisma from '@/lib/prisma';
import {DoctorLeaveReportQuery} from '@/types/reports/doctor.leave'
import { Prisma } from '@prisma/client';

// ==== GET DOCTOR LEAVES FOR REPORT (extended filters) ==== //
export const getDoctorLeaveReportService = async ({
  fromDateTime,
  toDateTime,
  institutionId,
  locationId,
  departmentId,
  specialityId,
  doctorId
}: DoctorLeaveReportQuery): Promise<{
  success: boolean;
  data?: any[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const trimmedDoctorId = doctorId?.trim();
    // When a specific doctor is selected, date range is optional (use wide default to fetch all leaves)
    const hasExplicitDoctor = Boolean(
      trimmedDoctorId && trimmedDoctorId !== '__all__'
    );
    const hasDateRange = Boolean(fromDateTime && toDateTime);

    if (!hasDateRange && !hasExplicitDoctor) {
      return {
        success: true,
        data: [],
        totalRecords: 0,
        message: 'Please select a date & time range, or select a doctor to view their leaves'
      };
    }

    // Use provided dates, or wide range when only doctor is selected (1970 to 2099)
    const fromDate = fromDateTime
      ? new Date(fromDateTime)
      : new Date('1970-01-01T00:00:00');
    const toDate = toDateTime
      ? new Date(toDateTime)
      : new Date('2099-12-31T23:59:59');

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: 'Invalid date format' }
      };
    }

    let doctorIds: string[] | null = null;

    if (hasExplicitDoctor && trimmedDoctorId) {
      doctorIds = [trimmedDoctorId];
    } else {
      // Build doctor IDs from filters via DoctorSession and Doctor
      const sessionWhere: Prisma.DoctorSessionWhereInput = { status: 1 };
      if (institutionId && institutionId !== '__all__' && institutionId !== '') {
        const instNum = parseInt(institutionId, 10);
        if (!isNaN(instNum)) sessionWhere.institution = instNum;
      }
      if (locationId && locationId !== '__all__' && locationId !== '') {
        sessionWhere.locationId = locationId;
      }
      if (departmentId && departmentId !== '__all__' && departmentId !== '') {
        sessionWhere.departmentId = departmentId;
      }

      const hasSessionFilters =
        sessionWhere.institution !== undefined ||
        sessionWhere.locationId !== undefined ||
        sessionWhere.departmentId !== undefined;

      const doctorWhere: Prisma.DoctorWhereInput = { status: 1 };
      if (specialityId && specialityId !== '__all__' && specialityId !== '') {
        doctorWhere.specialityId = specialityId;
      }
      const hasDoctorFilter = doctorWhere.specialityId !== undefined;

      if (hasSessionFilters || hasDoctorFilter) {
        if (hasSessionFilters) {
          const sessions = await prisma.doctorSession.findMany({
            where: sessionWhere,
            select: { doctorId: true },
            distinct: ['doctorId']
          });
          doctorIds = sessions.map((s) => s.doctorId).filter(Boolean);
        }
        if (hasDoctorFilter) {
          const doctors = await prisma.doctor.findMany({
            where: doctorWhere,
            select: { id: true }
          });
          const specialityDoctorIds = doctors.map((d) => d.id);
          if (doctorIds) {
            doctorIds = doctorIds.filter((id) => specialityDoctorIds.includes(id));
          } else {
            doctorIds = specialityDoctorIds;
          }
        }
      }
    }

    const leaveWhere: Prisma.DoctorLeaveWhereInput = {
      AND: [
        { toDate: { gte: fromDate } },
        { fromDate: { lte: toDate } }
      ]
    };
    if (doctorIds !== null && doctorIds.length > 0) {
      leaveWhere.doctorId = { in: doctorIds };
    } else if (doctorIds !== null && doctorIds.length === 0) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const [records, totalRecords] = await Promise.all([
      prisma.doctorLeave.findMany({
        where: leaveWhere,
        orderBy: { fromDate: 'desc' },
        include: {
          doctor: { select: { id: true, name: true, code: true } },
          createdUser: { select: { id: true, name: true } },
          updatedUser: { select: { id: true, name: true } }
        }
      }),
      prisma.doctorLeave.count({ where: leaveWhere })
    ]);

    return {
      success: true,
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.error('getDoctorLeaveReportService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? 'Failed to fetch doctor leave report' }
    };
  }
};