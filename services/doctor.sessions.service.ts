'use server';

import prisma from '@/lib/prisma';
import { CreateDoctorSessionPayload } from '@/types/doctor.session';
import { Prisma } from '@prisma/client';
import z from 'zod';

// ==== DOCTOR-SESSION: VALIDATION SCHEMA ==== //
const doctorSessionSchema = z.object({});

// ================ //
// CRUD OPERATIONS
// ================ //

// ==== GET DOCTOR SESSION ==== //
export const createDoctorSessionService = async (
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
    const parsed = doctorSessionSchema.safeParse(payload);

    if (!parsed.success) {
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
        institution: 
      }
    })

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
