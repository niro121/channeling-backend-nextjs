'use server';

import prisma from '@/lib/prisma';
import {
  getSpecialityQuery,
  GetSpecialityResponse,
  Speciality,
  SpecialityFormValues,
  UpdateSpecialityPayload
} from '@/types/speciality';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// ==== SPECIALITY: VALIDATION SCHEMA ==== //
const specialitySchema = z.object({
  name: z
    .string()
    .min(1, 'This field is mandatory')
    .max(150, 'Must be less than 150 characters'),
  code: z.string().min(1, 'This field is mandatory'),
  description: z.string().optional(),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Unpublish (0) or Publish (1)'
    })
});

const specialityUpdateSchema = specialitySchema.partial().extend({
  id: z.string().min(1, 'Speciality ID is required')
});

type specialityInput = z.infer<typeof specialitySchema>;

// ==== GET ALL SPECIALIIES ==== //
export const getAllSpecialitiesService = async ({
  page,
  limit,
  keyword
}: getSpecialityQuery): Promise<{
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
  try {
    const whereClause: Prisma.SpecialityWhereInput | undefined =
      keyword && keyword.trim() !== ''
        ? {
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
              }
            ]
          }
        : undefined;

    const [records, totalRecords] = await Promise.all([
      prisma.speciality.findMany({
        skip,
        take: limit,
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          createdUser: true,
          updatedUser: true
        }
      }),
      prisma.speciality.count({ where: whereClause })
    ]);

    return {
      success: true,
      data: {
        records,
        totalRecords
      },
      message: 'Specialities fetched successfully'
    };
  } catch (error: any) {
    console.log('getAllSpecialitiesService error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch specialities'
      }
    };
  }
};

// ==== CREATE A SPECIALITY ==== //
export const lastSpecialityCode = async () => {
  try {
    const lastSpeciality = await prisma.speciality.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { code: true }
    });

    return lastSpeciality;
  } catch (error: any) {
    throw new Error(error.message ?? 'lastSpecialityCode Error');
  }
};

export const createSpecialityService = async (
  payload: SpecialityFormValues,
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
    const parsed = specialitySchema.safeParse(payload);

    if (!parsed.success) {
      const err = parsed.error;
      const issues = err != null ? z.flattenError(err).fieldErrors : undefined;
      return {
        success: false,
        error: {
          message: 'Validation failed',
          ...(issues && { issues })
        }
      };
    }

    const data = parsed.data;

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const speciality = await prisma.speciality.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description ?? "",
        status: data.status,
        createdUser: userRelation,
        updatedUser: userRelation
      }
    });

    return {
      success: true,
      data: speciality,
      message: 'Speciality created successfully'
    };
  } catch (error: any) {
    console.error('createSpecialityService error:', error);

    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      return {
        success: false,
        error: {
          message: `A speciality with this ${field} already exists. Please use a different ${field}.`,
          issues: error.meta?.target
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create speciality'
      }
    };
  }
};

// ==== UPDATE A SPECIALITY ==== //
export const updateOneSpecialityService = async (
  id: string,
  payload: UpdateSpecialityPayload,
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
    const parsed = specialityUpdateSchema.safeParse({
      ...payload,
      id
    });

    if (!parsed.success) {
      const err = parsed.error;
      const issues = err != null ? z.flattenError(err).fieldErrors : undefined;
      return {
        success: false,
        error: {
          message: 'Validation failed',
          ...(issues && { issues })
        }
      };
    }

    const data = parsed.data;

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const speciality = await prisma.speciality.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        updatedUser: userRelation,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      data: speciality,
      message: 'Speciality updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneSpecialityService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Speciality not found'
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
        message: error.message || 'Failed to update speciality'
      }
    };
  }
};

// ==== GET ONE SPECIALITY ==== //
export const getSpecialityByIdService = async (
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
          message: 'Invalid speciality ID'
        }
      };
    }

    const speciality = await prisma.speciality.findUnique({
      where: { id: id },
      include: {
        createdUser: true,
        updatedUser: true
      }
    });

    if (!speciality) {
      return {
        success: false,
        error: {
          message: 'Speciality not found'
        }
      };
    }

    return {
      success: true,
      data: speciality,
      message: 'Speciality fetched successfully'
    };
  } catch (error: any) {
    console.error('getSpecialityByIdService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to get speciality'
      }
    };
  }
};

// ==== DELETE A SPECIALITY ==== //
export const deleteSpecialityByIdService = async (
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
    const speciality = await prisma.speciality.delete({
      where: {
        id: id
      }
    });

    return {
      success: true,
      data: speciality,
      message: 'Speciality deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteSpecialityByIdService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Speciality not found'
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete speciality'
      }
    };
  }
};

// ==== DELETE BULK SPECIALITIES ==== //
export const bulkDeleteSpecialitiesByIdsService = async (
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
          message: 'No speciality IDs provided'
        }
      };
    }

    const result = await prisma.speciality.deleteMany({
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
          message: 'No specialities found to delete'
        }
      };
    }

    return {
      success: true,
      data: {
        count: result.count
      },
      message: `${result.count} speciality(s) deleted successfully`
    };
  } catch (error: any) {
    console.error('bulkDeleteSpecialitiesByIdsService error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete specialities'
      }
    };
  }
};

// ==== GET ALL SPECIALITIES FOR EXPORT (NO PAGINATION) ==== //
export const getAllSpecialitiesForExportService = async (
  keyword?: string
): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    const whereClause: Prisma.SpecialityWhereInput | undefined =
      keyword && keyword.trim() !== ''
        ? {
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
              }
            ]
          }
        : undefined;

    const records = await prisma.speciality.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        createdUser: true,
        updatedUser: true
      }
    });

    return {
      success: true,
      data: records,
      message: 'Specialities fetched successfully'
    };
  } catch (error: any) {
    console.log('getAllSpecialitiesForExportService error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch specialities'
      }
    };
  }
};

// ==== GET DOCTOR COUNT FOR SPECIALITY ==== //
export const getDoctorCountBySpecialityIdService = async (
  specialityId: string
): Promise<{
  success: boolean;
  data?: number;
  error?: { message?: string };
}> => {
  try {
    if (!specialityId) {
      return {
        success: false,
        error: {
          message: 'Invalid speciality ID'
        }
      };
    }

    const count = await prisma.doctor.count({
      where: {
        specialityId: specialityId
      }
    });

    return {
      success: true,
      data: count
    };
  } catch (error: any) {
    console.error('getDoctorCountBySpecialityIdService error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get doctor count'
      }
    };
  }
};

// ==== GET TOTAL DOCTOR COUNT FOR MULTIPLE SPECIALITIES ==== //
export const getTotalDoctorCountBySpecialityIdsService = async (
  specialityIds: string[]
): Promise<{
  success: boolean;
  data?: number;
  error?: { message?: string };
}> => {
  try {
    if (!specialityIds || specialityIds.length === 0) {
      return {
        success: false,
        error: {
          message: 'Invalid speciality IDs'
        }
      };
    }

    const count = await prisma.doctor.count({
      where: {
        specialityId: {
          in: specialityIds
        }
      }
    });

    return {
      success: true,
      data: count
    };
  } catch (error: any) {
    console.error('getTotalDoctorCountBySpecialityIdsService error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get doctor count'
      }
    };
  }
};
