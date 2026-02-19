'use server';

import prisma from '@/lib/prisma';
import { getLocationQuery, Location, LocationFormValues } from '@/types/location';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

// ==== LOCATION: VALIDATION SCHEMA ==== //
const locationSchema = z.object({
  name: z
    .string()
    .min(1, 'This field is mandatory')
    .max(150, 'Must be less than 150 characters'),
  code: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  branchType: z
    .string()
    .min(1, 'This field is mandatory')
    .refine((val) => ['1', '2', '3'].includes(val), {
      message: 'BranchType must be Main Location (1), Branch (2) or Collection Center (3)'
    }),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Unpublish (0) or Publish (1)'
    })
});

const locationUpdateSchema = locationSchema.partial().extend({
  id: z.string().min(1, 'Location ID is required')
});

type locationInput = z.infer<typeof locationSchema>;

// ==== GET ALL LOCATIONS ==== //
export const getAllLocationsService = async ({
  page,
  limit,
  keyword,
  locationId
}: getLocationQuery): Promise<{
  success: boolean;
  data?: Location[];
  totalRecords?: number;
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    const whereClause: Prisma.LocationWhereInput | undefined =
      keyword && keyword?.trim() !== ''
        ? {
            OR: [
              {
                name: {
                  contains: keyword,
                  mode: Prisma.QueryMode.insensitive
                }
              },
              {
                city: {
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
            ],
            ...(locationId ? { branchType: locationId } : {})
          }
        : locationId
          ? { branchType: locationId }
          : undefined;

    const skip = page * limit;

    const [records, totalRecords] = await Promise.all([
      prisma.location.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        where: whereClause,
        include: {
          createdUser: true,
          updatedUser: true
        }
      }),
      prisma.location.count({ where: whereClause })
    ]);

    return {
      success: true,
      data: records as Location[],
      totalRecords
    };
  } catch (error: any) {
    console.error('getAllLocationsService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch locations'
      }
    };
  }
};

// ==== CREATE A LOCATION ==== //
export const createLocationService = async (
  payload: LocationFormValues,
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
    const parsed = locationSchema.safeParse(payload);

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

    // Check if code already exists
    const existingLocation = await prisma.location.findUnique({
      where: { code: data.code }
    });

    if (existingLocation) {
      return {
        success: false,
        error: {
          message: 'Location code already exists',
          issues: { code: ['Location code must be unique'] }
        }
      };
    }

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const location = await prisma.location.create({
      data: {
        name: data.name,
        code: data.code,
        addressLine1: data.addressLine1 ?? '',
        addressLine2: data.addressLine2 ?? '',
        city: data.city ?? '',
        branchType: Number(data.branchType),
        status: data.status,
        createdUser: userRelation,
        updatedUser: userRelation
      }
    });

    return {
      success: true,
      data: location,
      message: 'Location created successfully'
    };
  } catch (error: any) {
    console.error('createLocationService error:', error);

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
        message: error.message || 'Failed to create location'
      }
    };
  }
};

// ==== UPDATE A LOCATION ==== //
export const updateOneLocationService = async (
  id: string,
  payload: Partial<LocationFormValues>,
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
    const parsed = locationUpdateSchema.safeParse({
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

    // Check if code is being updated and if it already exists
    if (data.code) {
      const existingLocation = await prisma.location.findFirst({
        where: {
          code: data.code,
          id: { not: id }
        }
      });

      if (existingLocation) {
        return {
          success: false,
          error: {
            message: 'Location code already exists',
            issues: { code: ['Location code must be unique'] }
          }
        };
      }
    }

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const updateData: Prisma.LocationUpdateInput = {
      updatedAt: new Date(),
      updatedUser: userRelation
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.addressLine1 !== undefined)
      updateData.addressLine1 = data.addressLine1 ?? '';
    if (data.addressLine2 !== undefined)
      updateData.addressLine2 = data.addressLine2 ?? '';
    if (data.city !== undefined) updateData.city = data.city ?? '';
    if (data.branchType !== undefined)
      updateData.branchType = Number(data.branchType);
    if (data.status !== undefined) updateData.status = data.status;

    const location = await prisma.location.update({
      where: { id },
      data: updateData
    });

    return {
      success: true,
      data: location,
      message: 'Location updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneLocationService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Location not found'
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
        message: error.message || 'Failed to update location'
      }
    };
  }
};

// ==== GET ONE LOCATION ==== //
export const getLocationByIdService = async (
  id: string
): Promise<{
  success: boolean;
  data?: Location | null;
  message?: string;
  error?: {
    message?: string;
  };
}> => {
  try {
    if (!id || id.trim() === '') {
      return {
        success: false,
        error: {
          message: 'Location ID is required'
        }
      };
    }

    const result = await prisma.location.findUnique({
      where: { id },
      include: {
        createdUser: true,
        updatedUser: true
      }
    });

    return {
      success: true,
      data: result as Location | null
    };
  } catch (error: any) {
    console.error('getLocationByIdService error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to fetch location'
      }
    };
  }
};

// ==== DELETE A LOCATION ==== //
export const deleteLocationByIdService = async (
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
    if (!id || id.trim() === '') {
      return {
        success: false,
        error: {
          message: 'Location ID is required'
        }
      };
    }

    const location = await prisma.location.delete({
      where: { id }
    });

    return {
      success: true,
      data: location,
      message: 'Location deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteLocationByIdService error:', error);

    if (error.code === 'P2025') {
      return {
        success: false,
        error: {
          message: 'Location not found'
        }
      };
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete location'
      }
    };
  }
};

// ==== DELETE LOCATIONS ==== //
export const bulkDeleteLocationsByIdsService = async (
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
                    message: 'No location IDs provided'
                }
            };
        }

        const result = await prisma.location.deleteMany({
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
                    message: 'No locations found to delete'
                }
            };
        }

        return {
            success: true,
            data: {
                count: result.count
            },
            message: `${result.count} location(s) deleted successfully`
        };
    } catch (error: any) {
        console.error('bulkDeleteLocationsByIdsService error:', error);

        return {
            success: false,
            error: {
                message: error.message || 'Failed to delete locations'
            }
        };
    }
};

// ==== CHECK SINGLE LOCATION HAS LINKED RECORDS ==== //
export const checkLocationHasLinkedRecordsService = async (
    locationId: string
): Promise<{
    success: boolean
    data?: {
        hasLinkedRecords: boolean
    }
    error?: { message?: string }
}> => {
    try {
        if (!locationId) {
            return {
                success: false,
                error: {
                    message: "Invalid location ID"
                }
            }
        }

        // Check for Zone records associated with this location
        const zoneCount = await prisma.zone.count({
            where: {
                locationId: locationId
            }
        })

        // Check for Room records associated with this location
        const roomCount = await prisma.room.count({
            where: {
                locationId: locationId
            }
        })

        const hasLinkedRecords = zoneCount > 0 || roomCount > 0

        return {
            success: true,
            data: {
                hasLinkedRecords
            }
        }
    } catch (error: any) {
        console.error("checkLocationHasLinkedRecordsService error", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to check location linked records"
            }
        }
    }
}

// ==== CHECK LOCATIONS HAVE LINKED RECORDS ==== //
export const checkLocationsHaveLinkedRecordsService = async (
    locationIds: string[]
): Promise<{
    success: boolean
    data?: {
        hasLinkedRecords: boolean
    }
    error?: { message?: string }
}> => {
    try {
        if (!locationIds || locationIds.length === 0) {
            return {
                success: false,
                error: {
                    message: "Invalid location IDs"
                }
            }
        }

        // Check for Zone records associated with any of these locations
        const zoneCount = await prisma.zone.count({
            where: {
                locationId: {
                    in: locationIds
                }
            }
        })

        // Check for Room records associated with any of these locations
        const roomCount = await prisma.room.count({
            where: {
                locationId: {
                    in: locationIds
                }
            }
        })

        const hasLinkedRecords = zoneCount > 0 || roomCount > 0

        return {
            success: true,
            data: {
                hasLinkedRecords
            }
        }
    } catch (error: any) {
        console.error("checkLocationsHaveLinkedRecordsService error", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to check locations linked records"
            }
        }
    }
}