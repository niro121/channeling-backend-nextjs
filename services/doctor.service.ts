'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  CreateDoctorPayload,
  ExportDoctorQuery,
  getDoctorQuery,
  UpdateDoctorPayload
} from '@/types/doctor';
import { z } from 'zod';
import { sriLankaPhoneRegex, sriLankaMobileRegex } from '@/lib/regex';
import { padCode } from '@/lib/utils';
import { getNextSequenceNumber } from '@/services/channel-booking/helpers/sequence';

// ==== PREFIX ==== //
const PREFIX = 'DR';
const MAX_CODE = Number(process.env.MAX_CODE) || 1000;

// ==== DOCTOR: VALIDATION SCHEMA ==== //
const doctorSchema = z.object({
  title: z.string().min(1, 'This field is mandatory'),
  name: z
    .string()
    .min(1, 'This field is mandatory')
    .max(150, 'Must be less than 150 characters'),
  specialityId: z.string().min(1, 'This field is mandatory'),
  order: z.number().min(0, 'Must be 0 or greater'),
  phone: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => !val || sriLankaPhoneRegex.test(val),
      'Phone Number Ex: 07x xxxxxxx'
    ),
  mobile: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val.trim() === '' || sriLankaMobileRegex.test(val), 'Mobile Number Ex: 07x xxxxxxx'),
  registrationNumber: z.string().trim().optional().nullable(),
  qualification: z.string().trim().min(1, 'Qualification is required'),
  referralCharge: z.number().min(0, 'Must be 0 or greater'),
  sessionNoPrefix: z.string().optional().nullable(),
  fax: z.string().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Visibility must be Unpublish (0) or Publish (1)'
    })
});

const doctorUpdateSchema = doctorSchema.partial().extend({
  id: z.string().min(1, 'Doctor ID is required')
});

type doctorInput = z.infer<typeof doctorSchema>;

// ==== DOCTOR: LAST CODE ==== //
export const lastDoctorCode = async (): Promise<{
  success: boolean;
  message?: string;
  data?: string;
  error?: { message?: string };
}> => {
  try {
    const lastDoctor = await prisma.doctor.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { code: true }
    });

    if (!lastDoctor) {
      return {
        success: false,
        message: 'Code not found'
      };
    }

    return {
      success: true,
      data: lastDoctor.code
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        message: error.message || 'lastDoctorCode Error'
      }
    };
  }
};

// ==== DOCTOR: CODE GENERATION (Sequence model, same pattern as speciality/appointment) ==== //
const DOCTOR_SCOPE = 'doctor';

export const getNextDoctorCode = async (): Promise<{
  success: boolean;
  message?: string;
  data?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    const result = await getNextSequenceNumber(DOCTOR_SCOPE, {
      startFrom: 1,
      max: MAX_CODE,
    });

    if (!result.success) {
      return {
        success: false,
        message: 'Maximum Doctor code limit reached',
      };
    }

    return {
      success: true,
      data: `${PREFIX}${padCode(result.value, 4)}`, // FORMAT: DR0001
    };
  } catch (error: any) {
    console.log('getNextDoctorCode error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Getting code error',
      },
    };
  }
};

// ================ //
// CRUD OPERATIONS
// ================ //

// ==== CREATE DOCTOR ==== //
export const createDoctorService = async (
  payload: CreateDoctorPayload,
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
    const parsed = doctorSchema.safeParse(payload);

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

    const doctorCodeResult = await getNextDoctorCode();

    if (!doctorCodeResult.success || !doctorCodeResult.data) {
      return {
        success: false,
        message: doctorCodeResult.message || 'Failed to generate doctor code'
      };
    }

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const doctor = await prisma.doctor.create({
      data: {
        title: data.title,
        name: data.name,
        code: doctorCodeResult.data,
        order: data.order,
        phone: data.phone ?? null,
        mobile: data.mobile?.trim() || null,
        fax: data.fax?.trim() || null,
        addressLine1: data.addressLine1 ?? null,
        addressLine2: data.addressLine2 ?? null,
        city: data.city ?? null,
        registrationNumber: data.registrationNumber?.trim() || null,
        qualification: data.qualification,
        referralCharge: data.referralCharge,
        sessionNoPrefix: data.sessionNoPrefix ?? null,
        status: data.status,

        speciality: {
          connect: { id: data.specialityId }
        },

        createdUser: userRelation,
        updatedUser: userRelation
      }
    });

    return {
      success: true,
      data: doctor,
      message: 'Doctor created successfully'
    };
  } catch (error: any) {
    console.error('createDoctorService error:', error);

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
        message: error.message || 'Failed to create doctor'
      }
    };
  }
};

// ==== UPDATE DOCTOR ==== //
export const updateOneDoctorService = async (
  id: string,
  payload: UpdateDoctorPayload,
  user?: { id?: string }
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
    const parsed = doctorUpdateSchema.safeParse({
      ...payload,
      id
    });

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

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        title: data.title,
        name: data.name,
        order: data.order,
        phone: data.phone ?? null,
        mobile: data.mobile?.trim() || null,
        fax: data.fax?.trim() || null,
        addressLine1: data.addressLine1 ?? null,
        addressLine2: data.addressLine2 ?? null,
        city: data.city ?? null,
        registrationNumber: data.registrationNumber?.trim() || null,
        qualification: data.qualification,
        referralCharge: data.referralCharge,
        sessionNoPrefix: data.sessionNoPrefix ?? null,
        status: data.status,

        ...(data.specialityId && {
          speciality: {
            connect: { id: data.specialityId }
          }
        }),
        updatedUser: userRelation,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      data: doctor,
      message: 'Doctor updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneDoctorService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Doctor not found'
        }
      };
    }

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
        message: error.message || 'Failed to update doctor'
      }
    };
  }
};

// ==== DELETE DOCTOR ==== //
export const deleteDoctorByIdService = async (
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
    const doctor = await prisma.doctor.delete({
      where: { id }
    });

    return {
      success: true,
      data: doctor,
      message: 'Doctor deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteDoctorByIdService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Doctor not found'
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete doctor'
      }
    };
  }
};

// ==== DELETE BULK DOCTORS ==== //
export const bulkDeleteDoctorsByIdsService = async (
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
          message: 'No doctor IDs provided'
        }
      };
    }

    const result = await prisma.doctor.deleteMany({
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
          message: 'No doctors found to delete'
        }
      };
    }

    return {
      success: true,
      data: {
        count: result.count
      },
      message: `${result.count} doctor(s) deleted successfully`
    };
  } catch (error: any) {
    console.error('bulkDeleteDoctorsByIdsService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete doctors'
      }
    };
  }
};

// ==== GET DOCTORS ==== //
export const getAllDoctorsService = async ({
  page,
  limit,
  keyword,
  specialityId
}: getDoctorQuery): Promise<{
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
  const skip = page * limit;

  const whereClause: Prisma.DoctorWhereInput | undefined =
    keyword && keyword.trim() !== ''
      ? {
          OR: [
            { name: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
            { code: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
            {
              registrationNumber: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            }
          ],
          ...(specialityId ? { specialityId } : {})
        }
      : specialityId
        ? { specialityId }
        : undefined;

  try {
    const records = await prisma.doctor.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        createdUser: true,
        updatedUser: true
      }
    });

    const totalRecords = await prisma.doctor.count({
      where: whereClause
    });

    return {
      success: true,
      data: {
        records,
        totalRecords
      },
      message: 'Doctors fetched successfully'
    };
  } catch (error: any) {
    console.error('getAllDoctorsService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch doctors'
      }
    };
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

    // Try to fetch with speciality first
    // Note: in the fallback query we don't include `speciality`, so we keep this as `any`
    // to allow attaching `speciality: null` for downstream code paths.
    let doctor: any;
    try {
      doctor = await prisma.doctor.findUnique({
        where: { id },
        include: {
          createdUser: true,
          updatedUser: true,
          speciality: true
        }
      });
    } catch (relationError: any) {
      // If speciality relation fails (e.g., invalid specialityId), fetch without it
      if (relationError.message?.includes('Inconsistent query result') || 
          relationError.message?.includes('speciality')) {
        console.warn(`Doctor ${id} has invalid speciality relation, fetching without it`);
        doctor = await prisma.doctor.findUnique({
          where: { id },
          include: {
            createdUser: true,
            updatedUser: true
          }
        });
        // Manually set speciality to null if it wasn't included
        if (doctor) {
          doctor.speciality = null;
        }
      } else {
        throw relationError;
      }
    }

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

// ==== GET SPECIALITY LIST ==== //
export const getAllSpecialityOptionsService = async () => {
  try {
    const records = await prisma.speciality.findMany({
      where: { status: 1 }
    });

    const totalRecords = await prisma.speciality.count({
      where: { status: 1 }
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getAllSpecialityOptionsService error', error);
    throw error;
  }
};

// ==== DOCTOR LIST DOWLOAD ==== //
export const getAllDoctorsDownloadService = async ({
  keyword,
  specialityId
}: ExportDoctorQuery) => {
  try {
    const whereClause = {
      OR: [
        {
          name: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          code: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          registrationNumber: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ],
      ...(specialityId ? { specialityId } : {})
    };

    const [doctors, totalRecords] = await Promise.all([
      prisma.doctor.findMany({
        where: whereClause,
        include: {
          speciality: true
        }
      }),
      prisma.doctor.count({
        where: whereClause
      })
    ]);

    return {
      doctors,
      totalRecords
    };
  } catch (error: any) {
    console.error('getAllDoctorsDownloadService error', error);
    throw new Error(error.message ?? 'Error getting doctors');
  }
};
