'use server';

import prisma from '@/lib/prisma';
import {
  CreateDoctorSessionPayload,
  UpdateDoctorSessionPayload,
  DoctorSession,
  getDoctorSessionQuery
} from '@/types/doctor.session';
import { Prisma } from '@prisma/client';
import z from 'zod';

// ==== DOCTOR-SESSION: VALIDATION SCHEMA ==== //
const feeSchema = z.object({
  id: z.string().nonempty('Fee id is required'),
  name: z.string().nonempty('Fee name is required'),
  feeType: z.string().nonempty('Fee type is required'),
  localFee: z.number().min(0, 'Local fee must be 0 or greater'),
  foreignFee: z.number().min(0, 'Foreign fee must be 0 or greater')
});

const doctorSessionSchema = z
  .object({
    name: z
      .string()
      .nonempty('This field is mandatory')
      .max(150, 'Must be less than 150 characters'),

    institution: z.number().min(0, 'This field is mandatory'),

    startTime: z.coerce.date().refine((d) => !isNaN(d.getTime()), {
      message: 'Start time is required'
    }),

    endTime: z.coerce.date().refine((d) => !isNaN(d.getTime()), {
      message: 'End time is required'
    }),

    durationMinutes: z.number().min(1).nonoptional('This field is mandatory'),
    scheduleId: z.number().optional(),

    startingPatientNumber: z.number().min(1, 'Minimum value is 1'),
    maxPatientNumber: z.number().min(1, 'Minimum value is 1'),

    refundable: z.number().int().min(0).max(1),
    advancedBookingDays: z.number().min(0).max(100),

    fees: z.array(feeSchema),
    amountLocal: z.coerce.number().min(0.01, 'Local fee must be greater than 0'),
    amountForeign: z.coerce
      .number()
      .min(0.01, 'Foreign fee must be greater than 0'),

    dayType: z.number().min(1).max(8),
    applyTo: z.coerce.date().optional().nullable(),

    status: z.number().int().min(0).max(1),

    doctorId: z.string().nonempty('Doctor is required'),
    departmentId: z.string().nonempty('Department is required'),
    locationId: z.string().nonempty('Location is required'),
    roomId: z.string().nonempty('Room is required'),

    previousSessionId: z.string().optional(),

    createdBy: z.string().optional(),
    updatedBy: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.dayType === 8 && !data.applyTo) {
      ctx.addIssue({
        path: ['applyTo'],
        message: 'This field is mandatory',
        code: z.ZodIssueCode.custom
      });
    }

    if (data.startTime >= data.endTime) {
      ctx.addIssue({
        path: ['endTime'],
        message: 'End time must be after start time',
        code: z.ZodIssueCode.custom
      });
    }
  });

// ================ //
// CRUD OPERATIONS
// ================ //

// ==== CREATE DOCTOR SESSION ==== //
export const createDoctorSessionService = async (
  doctorId: string,
  payload: CreateDoctorSessionPayload,
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
    issues?: any;
  };
}> => {
  try {
    const isDoctor = await getDoctorByIdService(doctorId);

    if (!isDoctor) {
      return {
        success: false,
        message: 'Doctor not found'
      };
    }

    const parsed = doctorSessionSchema.safeParse({
      ...payload,
      doctorId: doctorId
    });

    if (!parsed.success) {
      console.log('Validation unsuccessfull');
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors
        }
      };
    }

    const data = parsed.data;

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const doctorSession = await prisma.doctorSession.create({
      data: {
        name: data.name,
        institution: data.institution,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
        startingPatientNumber: data.startingPatientNumber,
        maxPatientNumber: data.maxPatientNumber,
        refundable: data.refundable,
        advancedBookingDays: data.advancedBookingDays,
        fees: data.fees,
        amountLocal: data.amountLocal,
        amountForeign: data.amountForeign,
        ...(data.applyTo ? { applyTo: data.applyTo } : null),
        dayType: data.dayType,
        status: data.status,
        doctor: { connect: { id: data.doctorId } },
        department: { connect: { id: data.departmentId } },
        location: { connect: { id: data.locationId } },
        room: { connect: { id: data.roomId } },
        ...(data.previousSessionId
          ? { previousSession: { connect: { id: data.previousSessionId } } }
          : null),
        createdUser: userRelation,
        updatedUser: userRelation
      }
    });

    return {
      success: true,
      data: doctorSession,
      message: 'Doctor session created successfully'
    };
  } catch (error: any) {
    console.error('createDoctorSessionService error:', error);

    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: error.meta?.target
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create doctor session'
      }
    };
  }
};

// ==== UPDATE DOCTOR SESSION ==== //
export const updateDoctorSessionService = async (
  doctorId: string,
  sessionId: string,
  payload: UpdateDoctorSessionPayload,
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
    issues?: any;
  };
}> => {
  try {
    const isDoctor = await getDoctorByIdService(doctorId);

    if (!isDoctor) {
      return {
        success: false,
        message: 'Doctor not found'
      };
    }

    const existingSession = await prisma.doctorSession.findUnique({
      where: { id: sessionId }
    });

    if (!existingSession) {
      return {
        success: false,
        message: 'Doctor session not found'
      };
    }

    const parsed = doctorSessionSchema.safeParse({
      ...payload,
      doctorId: existingSession.doctorId
    });

    if (!parsed.success) {
      console.log('Validation unsuccessful');
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors
        }
      };
    }

    const data = parsed.data;

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const updatedSession = await prisma.doctorSession.update({
      where: { id: sessionId },
      data: {
        name: data.name,
        institution: data.institution,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: data.durationMinutes,
        startingPatientNumber: data.startingPatientNumber,
        maxPatientNumber: data.maxPatientNumber,
        refundable: data.refundable,
        advancedBookingDays: data.advancedBookingDays,
        fees: data.fees,
        amountLocal: data.amountLocal,
        amountForeign: data.amountForeign,
        dayType: data.dayType,
        status: data.status,

        ...(data.applyTo !== undefined ? { applyTo: data.applyTo } : {}),

        department: { connect: { id: data.departmentId } },
        location: { connect: { id: data.locationId } },
        room: { connect: { id: data.roomId } },

        ...(data.previousSessionId
          ? { previousSession: { connect: { id: data.previousSessionId } } }
          : { previousSession: { disconnect: true } }),

        updatedUser: userRelation
      }
    });

    // console.log('Updated session:', updatedSession);

    return {
      success: true,
      data: updatedSession,
      message: 'Doctor session updated successfully'
    };
  } catch (error: any) {
    console.error('updateDoctorSessionService error:', error);

    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Duplicate record detected',
          issues: error.meta?.target
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update doctor session'
      }
    };
  }
};

// ==== GET DOCTOR SESSIONS ==== //
export const getAllDoctorSessionsService = async ({
  page,
  limit,
  doctorId,
  locationId,
  institutionId
}: getDoctorSessionQuery): Promise<{
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
  const whereClause: Prisma.DoctorSessionWhereInput = {};
  if (doctorId) whereClause.doctorId = doctorId;
  if (locationId) whereClause.locationId = locationId;
  if (institutionId) {
    const instNum = parseInt(institutionId, 10);
    if (!isNaN(instNum)) whereClause.institution = instNum;
  }

  const usePagination = !doctorId;
  const skip = usePagination ? page * limit : 0;
  const take = usePagination ? limit : 10000;

  try {
    const records = await prisma.doctorSession.findMany({
      skip,
      take,
      where: Object.keys(whereClause).length ? whereClause : undefined,
      orderBy: [{ dayType: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }],
      include: {
        doctor: true,
        location: true,
        department: true,
        room: true,
        createdUser: true,
        updatedUser: true
      }
    });

    const totalRecords = await prisma.doctorSession.count({
      where: Object.keys(whereClause).length ? whereClause : undefined
    });

    return {
      success: true,
      data: {
        records,
        totalRecords
      },
      message: 'Doctor sessions fetched successfully'
    };
  } catch (error: any) {
    console.error('getAllDoctorSessionsService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch doctor sessions'
      }
    };
  }
};

// ==== GET ONE DOCTOR SESSION ==== //
export const getDoctorSessionByIdService = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    if (!id) {
      return {
        success: false,
        error: {
          message: 'Invalid doctor session ID'
        }
      };
    }

    const session = await prisma.doctorSession.findUnique({
      where: { id },
      include: {
        doctor: true,
        location: true,
        department: true,
        room: true,
        previousSession: true,
        previousSessions: true,
        createdUser: true,
        updatedUser: true
      }
    });

    if (!session) {
      return {
        success: false,
        error: {
          message: 'Doctor session not found'
        }
      };
    }

    return {
      success: true,
      data: session,
      message: 'Doctor session fetched successfully'
    };
  } catch (error: any) {
    console.error('getDoctorSessionByIdService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to get doctor session'
      }
    };
  }
};

// ==== DELETE DOCTOR SESSION ==== //
export const deleteDoctorSessionByIdService = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    const session = await prisma.doctorSession.delete({
      where: { id }
    });

    return {
      success: true,
      data: session,
      message: 'Doctor session deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteDoctorSessionByIdService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Doctor session not found'
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete doctor session'
      }
    };
  }
};

// ==== DELETE BULK DOCTOR SESSIONS ==== //
export const bulkDeleteDoctorSessionsByIdsService = async (
  ids: string[]
): Promise<{
  success: boolean;
  data?: {
    count: number;
  };
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    if (!ids || ids.length === 0) {
      return {
        success: false,
        error: {
          message: 'No doctor session IDs provided'
        }
      };
    }

    // Clear previousSessionId on any DoctorSession that points to one we're deleting
    // to avoid violating the PreviousSession relation on delete
    await prisma.doctorSession.updateMany({
      where: {
        previousSessionId: { in: ids }
      },
      data: { previousSessionId: null }
    });

    const result = await prisma.doctorSession.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    if (result.count === 0) {
      return {
        success: false,
        error: {
          message: 'No doctor sessions found to delete'
        }
      };
    }

    return {
      success: true,
      data: {
        count: result.count
      },
      message: `${result.count} doctor session(s) deleted successfully`
    };
  } catch (error: any) {
    console.error('bulkDeleteDoctorSessionsByIdsService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete doctor sessions'
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

// ==== GET ONE DOCTOR ==== //
export const getDoctorByIdService = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    if (!id) {
      return {
        success: false,
        error: {
          message: 'Invalid doctor ID'
        }
      };
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        createdUser: true,
        updatedUser: true,
        speciality: true
      }
    });

    if (!doctor) {
      return {
        success: false,
        error: { message: 'Doctor not found' }
      };
    }

    return {
      success: true,
      data: doctor,
      message: 'Doctor fetched successfully'
    };
  } catch (error: any) {
    console.error('getDoctorByIdService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to get doctor'
      }
    };
  }
};

// ==== GET DEPARTMENT OPTIONS ==== //
export const getDepartmentOptionsService = async () => {
  try {
    const records = await prisma.department.findMany({
      where: { visibility: 1 },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true
      }
    });

    const totalRecords = await prisma.department.count({
      where: { visibility: 1 }
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getDepartmentOptionsService error', error);
    throw error;
  }
};

// ==== GET LOCATION OPTIONS ==== //
export const getLocationOptionsService = async () => {
  try {
    const records = await prisma.location.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true
      }
    });

    const totalRecords = await prisma.location.count({
      where: { status: 1 }
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getLocationOptionsService error', error);
    throw error;
  }
};

// ==== GET ALL ROOMS BY LOCATION ID ==== //
export const getAllRoomsByLocaionIDService = async (locationId: string) => {
  try {
    const records = await prisma.room.findMany({
      where: { status: 1, locationId },
      orderBy: { number: 'asc' }
    });

    return records;
  } catch (error: any) {
    console.log('getAllRoomsByLocaionIDService error', error);
    throw error;
  }
};
